import { Worker } from "worker_threads";
import { FunctionSchema } from "../constants/function-registry";
import { ExecutionResult } from "../types/execution-results";
import { CodeValidator } from "../validators/code-validator";
import { BaseCodeRunner } from "./base-runner";
import * as path from "path";

interface WorkerMessage {
	id: number;
	success: boolean;
	result?: any;
	error?: {
		message: string;
		name: string;
		stack?: string;
	};
	logs: Array<{
		type: "log" | "error" | "warn";
		message: string;
		timestamp: number;
	}>;
	executionTime: number;
}

interface PooledWorker {
	worker: Worker;
	busy: boolean;
	executionCount: number;
	createdAt: number;
}

const DEFAULT_POOL_SIZE = 2;
const MAX_EXECUTIONS_PER_WORKER = 100;
const MAX_WORKER_AGE_MS = 10 * 60 * 1000; // 10 minutes

export class NodeRunner implements BaseCodeRunner {
	private pool: PooledWorker[] = [];
	private waitQueue: Array<(pw: PooledWorker) => void> = [];
	private executionId = 0;
	private isTerminating = false;
	private readonly workerPath: string;
	private readonly maxMemoryMB: number;
	private readonly poolSize: number;
	private readonly maxExecutionsPerWorker: number;
	private readonly maxWorkerAgeMs: number;

	constructor(
		options: {
			maxMemoryMB?: number;
			poolSize?: number;
			maxExecutionsPerWorker?: number;
			maxWorkerAgeMs?: number;
		} = {},
	) {
		this.workerPath = path.join(__dirname, "../../../public/node-worker.js");
		this.maxMemoryMB = options.maxMemoryMB || 128;
		this.poolSize = options.poolSize || DEFAULT_POOL_SIZE;
		this.maxExecutionsPerWorker =
			options.maxExecutionsPerWorker || MAX_EXECUTIONS_PER_WORKER;
		this.maxWorkerAgeMs = options.maxWorkerAgeMs || MAX_WORKER_AGE_MS;

		// Pre-warm the pool
		for (let i = 0; i < this.poolSize; i++) {
			this.pool.push(this.createPooledWorker());
		}
	}

	// ── Worker lifecycle ───────────────────────────────────

	private createPooledWorker(): PooledWorker {
		const worker = new Worker(this.workerPath, {
			resourceLimits: {
				maxOldGenerationSizeMb: this.maxMemoryMB,
				maxYoungGenerationSizeMb: this.maxMemoryMB / 2,
				codeRangeSizeMb: 16,
			},
			env: {},
		});

		const pw: PooledWorker = {
			worker,
			busy: false,
			executionCount: 0,
			createdAt: Date.now(),
		};

		worker.on("error", (error) => {
			console.error("[NodeRunner] Worker error:", error.message);
			this.replaceWorker(pw);
		});

		worker.on("exit", (code) => {
			if (code !== 0 && !this.isTerminating) {
				console.error(`[NodeRunner] Worker exited with code ${code}`);
				this.replaceWorker(pw);
			}
		});

		return pw;
	}

	/**
	 * Terminate old worker (frees its V8 isolate) and replace with a fresh one.
	 */
	private replaceWorker(pw: PooledWorker): void {
		if (this.isTerminating) return;

		const idx = this.pool.indexOf(pw);
		if (idx === -1) return;

		pw.worker.removeAllListeners();
		pw.worker.terminate().catch(() => {});

		const newPw = this.createPooledWorker();
		this.pool[idx] = newPw;

		// Hand to next waiting caller if any
		if (this.waitQueue.length > 0) {
			const next = this.waitQueue.shift()!;
			newPw.busy = true;
			next(newPw);
		}
	}

	private shouldRecycle(pw: PooledWorker): boolean {
		return (
			pw.executionCount >= this.maxExecutionsPerWorker ||
			Date.now() - pw.createdAt > this.maxWorkerAgeMs
		);
	}

	// ── Pool management ────────────────────────────────────

	private acquire(): Promise<PooledWorker> {
		const idle = this.pool.find((pw) => !pw.busy);
		if (idle) {
			idle.busy = true;
			return Promise.resolve(idle);
		}

		// All busy — wait in queue
		return new Promise((resolve) => {
			this.waitQueue.push(resolve);
		});
	}

	private release(pw: PooledWorker): void {
		pw.busy = false;
		pw.executionCount++;

		// Recycle if stale — this is what prevents the slow memory creep
		if (this.shouldRecycle(pw)) {
			console.info(
				`[NodeRunner] Recycling worker (executions: ${pw.executionCount}, ` +
					`age: ${((Date.now() - pw.createdAt) / 1000).toFixed(0)}s)`,
			);
			this.replaceWorker(pw);
			return;
		}

		// Hand to next waiting caller
		if (this.waitQueue.length > 0) {
			const next = this.waitQueue.shift()!;
			pw.busy = true;
			next(pw);
		}
	}

	// ── Execution ──────────────────────────────────────────

	async execute(
		functionBody: string,
		schema: FunctionSchema,
		args: any[],
	): Promise<ExecutionResult> {
		const validation = CodeValidator.validate(functionBody, schema);
		if (!validation.isValid || !validation.wrappedCode) {
			return {
				success: false,
				timestamp: new Date().toISOString(),
				error: {
					message: validation.errors.join("\n"),
					name: "ValidationError",
				},
				logs: [],
				validation,
			};
		}

		const pw = await this.acquire();

		return new Promise((resolve) => {
			const id = ++this.executionId;
			const timeout = schema.timeout || 5000;

			const cleanup = () => {
				pw.worker.removeListener("message", onMessage);
				clearTimeout(timeoutId);
			};

			const onMessage = (message: WorkerMessage) => {
				if (message.id !== id) return;

				cleanup();
				this.release(pw);

				resolve({
					timestamp: new Date().toISOString(),
					success: message.success,
					result: message.result,
					error: message.error,
					logs: message.logs,
					executionTime: message.executionTime,
					validation,
				});
			};

			const timeoutId = setTimeout(() => {
				cleanup();

				// Timeout: kill THIS worker and replace it (bounded — pool stays fixed size)
				this.replaceWorker(pw);

				resolve({
					success: false,
					timestamp: new Date().toISOString(),
					error: {
						message: `Execution timeout after ${timeout}ms`,
						name: "TimeoutError",
					},
					logs: [],
					validation,
				});
			}, timeout);

			pw.worker.on("message", onMessage);

			pw.worker.postMessage({
				id,
				code: validation.wrappedCode,
				functionName: schema.name,
				args,
				timeout,
			});
		});
	}

	// ── Cleanup ────────────────────────────────────────────

	async terminate(): Promise<void> {
		this.isTerminating = true;
		this.waitQueue = [];

		await Promise.all(
			this.pool.map((pw) => {
				pw.worker.removeAllListeners();
				return pw.worker.terminate().catch(() => {});
			}),
		);

		this.pool = [];
	}

	// ── Diagnostics (expose via /metrics) ──────────────────

	getStats() {
		return {
			poolSize: this.pool.length,
			busy: this.pool.filter((pw) => pw.busy).length,
			idle: this.pool.filter((pw) => !pw.busy).length,
			waitingInQueue: this.waitQueue.length,
			workers: this.pool.map((pw) => ({
				busy: pw.busy,
				executionCount: pw.executionCount,
				ageSeconds: ((Date.now() - pw.createdAt) / 1000).toFixed(0),
			})),
		};
	}
}
