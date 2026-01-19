const { parentPort } = require("worker_threads");
const vm = require("vm");

// Create a secure sandbox context
function createSandbox() {
	const logs = [];

	// Safe console implementation that captures logs
	const safeConsole = {
		log: (...args) => {
			logs.push({
				type: "log",
				message: args
					.map((arg) => {
						try {
							return typeof arg === "object"
								? JSON.stringify(arg)
								: String(arg);
						} catch {
							return "[Circular or Non-Serializable]";
						}
					})
					.join(" "),
				timestamp: Date.now(),
			});
		},
		error: (...args) => {
			logs.push({
				type: "error",
				message: args
					.map((arg) => {
						try {
							return typeof arg === "object"
								? JSON.stringify(arg)
								: String(arg);
						} catch {
							return "[Circular or Non-Serializable]";
						}
					})
					.join(" "),
				timestamp: Date.now(),
			});
		},
		warn: (...args) => {
			logs.push({
				type: "warn",
				message: args
					.map((arg) => {
						try {
							return typeof arg === "object"
								? JSON.stringify(arg)
								: String(arg);
						} catch {
							return "[Circular or Non-Serializable]";
						}
					})
					.join(" "),
				timestamp: Date.now(),
			});
		},
		info: (...args) => {
			logs.push({
				type: "log",
				message: args
					.map((arg) => {
						try {
							return typeof arg === "object"
								? JSON.stringify(arg)
								: String(arg);
						} catch {
							return "[Circular or Non-Serializable]";
						}
					})
					.join(" "),
				timestamp: Date.now(),
			});
		},
	};

	// Whitelist of safe global functions
	const sandbox = {
		console: safeConsole,
		// Safe globals
		Array,
		Boolean,
		Date,
		Error,
		// Function, // Removed - should not be accessible
		JSON,
		Math,
		Number,
		Object,
		Promise,
		RegExp,
		String,
		Symbol,
		Map,
		Set,
		WeakMap,
		WeakSet,
		parseInt,
		parseFloat,
		isNaN,
		isFinite,
		encodeURI,
		encodeURIComponent,
		decodeURI,
		decodeURIComponent,
		// Utility functions for ONDC operations
		setTimeout: (fn, delay) => {
			if (delay < 1 || delay > 35 * 1000) {
				throw new Error("Timeout must be between 1-35000ms");
			}
			return setTimeout(fn, delay);
		},
		clearTimeout,
		// Blocked globals
		require: undefined,
		process: undefined,
		global: undefined,
		globalThis: undefined,
		Buffer: undefined,
		__dirname: undefined,
		__filename: undefined,
		module: undefined,
		exports: undefined,
		eval: undefined,
		Function: undefined,
	};

	return { sandbox, logs };
}

// Handle messages from main thread
parentPort?.on("message", async (message) => {
	const { id, code, functionName, args, timeout } = message;
	const startTime = Date.now();

	try {
		// Create fresh sandbox for each execution
		const { sandbox, logs } = createSandbox();

		// Create VM context with timeout
		const context = vm.createContext(sandbox);

		// Compile and run the code with timeout
		const script = new vm.Script(code, {
			filename: `user-function-${id}.js`,
			timeout: timeout || 5000,
		});

		// Execute the script
		script.runInContext(context, {
			timeout: timeout || 35000,
			breakOnSigint: true,
		});

		// Get the function from the context
		const userFunction = context[functionName];

		if (typeof userFunction !== "function") {
			throw new Error(`${functionName} is not a function`);
		}

		// Execute the function
		const result = await Promise.race([
			Promise.resolve(userFunction(...args)),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("Function execution timeout")),
					timeout || 5000,
				),
			),
		]);

		const executionTime = Date.now() - startTime;

		// Serialize result safely
		let serializedResult;
		try {
			serializedResult = JSON.parse(JSON.stringify(result));
		} catch {
			serializedResult = String(result);
		}

		parentPort?.postMessage({
			id,
			success: true,
			result: serializedResult,
			logs,
			executionTime,
		});
	} catch (error) {
		const executionTime = Date.now() - startTime;

		parentPort?.postMessage({
			id,
			success: false,
			error: {
				message: error.message || "Unknown error",
				name: error.name || "Error",
				stack: error.stack,
			},
			logs: [
				{
					type: "error",
					message: error.message || "Unknown error",
					timestamp: Date.now(),
				},
			],
			executionTime,
		});
	}
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	console.error("Uncaught exception in worker:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled rejection in worker:", reason);
	process.exit(1);
});
