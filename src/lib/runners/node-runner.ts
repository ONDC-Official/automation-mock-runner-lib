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

export class NodeRunner implements BaseCodeRunner {
	private worker: Worker | null = null;
	private executionId = 0;
	private pendingExecutions = new Map<
		number,
		{
			resolve: (result: ExecutionResult) => void;
			timeout: NodeJS.Timeout;
		}
	>();
	private readonly workerPath: string;
	private readonly maxMemoryMB: number;

	constructor(options: { maxMemoryMB?: number } = {}) {
		this.workerPath = path.join(__dirname, "../../../public/node-worker.js");
		this.maxMemoryMB = options.maxMemoryMB || 128;
		this.initWorker();
	}

	private initWorker() {
		if (this.worker) {
			this.worker.terminate();
		}

		// Create worker with resource limits
		this.worker = new Worker(this.workerPath, {
			resourceLimits: {
				maxOldGenerationSizeMb: this.maxMemoryMB,
				maxYoungGenerationSizeMb: this.maxMemoryMB / 2,
				codeRangeSizeMb: 16,
			},
			// Prevent worker from accessing parent environment variables
			env: {},
		});

		this.worker.on("message", (message: WorkerMessage) => {
			const { id, success, result, error, logs, executionTime } = message;
			const pending = this.pendingExecutions.get(id);

			if (pending) {
				clearTimeout(pending.timeout);
				this.pendingExecutions.delete(id);

				pending.resolve({
					timestamp: new Date().toISOString(),
					success,
					result,
					error,
					logs,
					executionTime,
					validation: { isValid: true, errors: [], warnings: [] },
				});
			}
		});

		this.worker.on("error", (error) => {
			console.error("Worker error:", error);
			// Resolve all pending executions with error
			this.pendingExecutions.forEach((pending, id) => {
				clearTimeout(pending.timeout);
				pending.resolve({
					success: false,
					timestamp: new Date().toISOString(),
					error: {
						message: error.message || "Worker crashed",
						name: "WorkerError",
					},
					logs: [],
					validation: { isValid: true, errors: [], warnings: [] },
				});
			});
			this.pendingExecutions.clear();
			this.initWorker();
		});

		this.worker.on("exit", (code) => {
			if (code !== 0) {
				console.error(`Worker stopped with exit code ${code}`);
				// Handle any pending executions
				this.pendingExecutions.forEach((pending, id) => {
					clearTimeout(pending.timeout);
					pending.resolve({
						success: false,
						timestamp: new Date().toISOString(),
						error: {
							message: `Worker exited with code ${code}`,
							name: "WorkerExitError",
						},
						logs: [],
						validation: { isValid: true, errors: [], warnings: [] },
					});
				});
				this.pendingExecutions.clear();
			}
		});
	}

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

		return new Promise((resolve) => {
			const id = ++this.executionId;
			const timeout = schema.timeout || 5000;

			const timeoutId = setTimeout(() => {
				this.pendingExecutions.delete(id);
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

				// Restart worker to kill the hanging execution
				this.initWorker();
			}, timeout);

			this.pendingExecutions.set(id, {
				resolve: (result) => {
					resolve({ ...result, validation });
				},
				timeout: timeoutId,
			});

			// Send code to worker for execution
			this.worker?.postMessage({
				id,
				code: validation.wrappedCode,
				functionName: schema.name,
				args,
				timeout,
			});
		});
	}

	terminate() {
		// Clear all pending executions
		this.pendingExecutions.forEach((pending) => {
			clearTimeout(pending.timeout);
			pending.resolve({
				success: false,
				timestamp: new Date().toISOString(),
				error: {
					message: "Runner terminated",
					name: "TerminationError",
				},
				logs: [],
				validation: { isValid: true, errors: [], warnings: [] },
			});
		});
		this.pendingExecutions.clear();

		// Terminate worker
		this.worker?.terminate();
		this.worker = null;
	}
}
