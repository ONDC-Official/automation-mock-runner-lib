import { Worker } from "worker_threads";
import { BrowserRunner } from "./browser-runner";
import { NodeRunner } from "./node-runner";

/**
 * Factory for creating workers in both browser and Node.js environments
 */
export class RunnerFactory {
	/**
	 * Creates a Web Worker for browser environment
	 */
	static createCodeRunnerWorker(): Worker {
		// Browser environment - returns Web Worker
		if (typeof window !== "undefined" && typeof Worker !== "undefined") {
			// Inline worker code for browser
			const workerCode = `
				self.addEventListener('message', (event) => {
					const { id, code, functionName, args } = event.data;
					const startTime = performance.now();
					const logs = [];

					// Override console to capture logs
					const originalConsole = { ...console };
					console.log = (...args) => {
						logs.push(args.join(' '));
						originalConsole.log(...args);
					};

					try {
						// Execute code
						eval(code);
						const fn = self[functionName];
						
						if (typeof fn !== 'function') {
							throw new Error(\`\${functionName} is not a function\`);
						}

						const result = fn(...args);
						const executionTime = performance.now() - startTime;

						self.postMessage({
							id,
							success: true,
							result,
							logs,
							executionTime
						});
					} catch (error) {
						const executionTime = performance.now() - startTime;
						self.postMessage({
							id,
							success: false,
							error: {
								message: error.message,
								name: error.name,
								stack: error.stack
							},
							logs,
							executionTime
						});
					} finally {
						// Restore console
						console.log = originalConsole.log;
					}
				});
			`;

			const blob = new Blob([workerCode], { type: "application/javascript" });
			const workerUrl = URL.createObjectURL(blob);
			return new Worker(workerUrl) as any;
		}

		// Node.js environment - returns Worker Thread
		// This shouldn't be called for NodeRunner, but included for completeness
		throw new Error(
			"Use NodeRunner directly in Node.js environment instead of WorkerFactory",
		);
	}

	/**
	 * Creates a Worker Thread for Node.js environment
	 * Note: This is primarily for internal use by NodeRunner
	 */
	static createNodeWorker(workerPath: string, options?: any): Worker {
		if (typeof Worker === "undefined") {
			throw new Error("Worker threads not available in this environment");
		}

		return new Worker(workerPath, options);
	}

	/**
	 * Detects the current environment
	 */
	static getEnvironment(): "browser" | "node" | "unknown" {
		if (typeof window !== "undefined" && typeof document !== "undefined") {
			return "browser";
		}
		if (typeof process !== "undefined" && process.versions?.node) {
			return "node";
		}
		return "unknown";
	}

	/**
	 * Creates appropriate runner based on environment
	 */
	static createRunner(options?: any, logger?: any): BrowserRunner | NodeRunner {
		const env = RunnerFactory.getEnvironment();
		logger?.debug(`Creating runner for environment: ${env}`);
		if (env === "browser") {
			return new BrowserRunner();
		} else if (env === "node") {
			return new NodeRunner(options);
		}

		throw new Error(`Unsupported environment: ${env}`);
	}
}
