const { parentPort, workerData } = require("worker_threads");
const vm = require("vm");

const ALLOWED_FETCH_BASE_URLS = Array.isArray(workerData?.allowedFetchBaseUrls)
	? workerData.allowedFetchBaseUrls
	: [];

// Parse + normalize allowlist entries once per worker.
// Each entry contributes { origin, pathname } where pathname has no trailing
// slash; matching requires request.origin === entry.origin AND the request
// pathname is a strict segment-prefix of entry.pathname (so `/v1` matches
// `/v1` and `/v1/foo` but NOT `/v10/foo`).
const PARSED_ALLOWLIST = ALLOWED_FETCH_BASE_URLS.map((raw) => {
	try {
		const u = new URL(raw);
		let pathname = u.pathname;
		if (pathname.endsWith("/") && pathname !== "/") {
			pathname = pathname.slice(0, -1);
		}
		return { origin: u.origin, pathname };
	} catch {
		return null;
	}
}).filter(Boolean);

function isFetchAllowed(requestUrl) {
	let parsed;
	try {
		parsed = new URL(requestUrl);
	} catch {
		return false;
	}
	let reqPath = parsed.pathname;
	if (reqPath.endsWith("/") && reqPath !== "/") {
		reqPath = reqPath.slice(0, -1);
	}
	for (const entry of PARSED_ALLOWLIST) {
		if (parsed.origin !== entry.origin) continue;
		if (entry.pathname === "" || entry.pathname === "/") return true;
		if (reqPath === entry.pathname) return true;
		if (reqPath.startsWith(entry.pathname + "/")) return true;
	}
	return false;
}

function makeScopedFetch() {
	if (typeof globalThis.fetch !== "function") {
		return undefined;
	}
	if (PARSED_ALLOWLIST.length === 0) {
		return undefined;
	}
	return async function scopedFetch(input, init) {
		const requestUrl =
			typeof input === "string"
				? input
				: input && typeof input.url === "string"
				? input.url
				: String(input);
		if (!isFetchAllowed(requestUrl)) {
			throw new Error(
				`fetch blocked: ${requestUrl} is not in the configured allowlist`,
			);
		}
		return globalThis.fetch(input, { ...(init || {}), redirect: "error" });
	};
}

// Create a secure sandbox context
function createSandbox(functionName) {
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
			if (delay < 1 || delay > 45 * 1000) {
				throw new Error("Timeout must be between 1-45000ms");
			}
			return setTimeout(fn, delay);
		},
		clearTimeout,
		// AbortController is a pure control-flow primitive with no I/O of its
		// own — safe to expose unconditionally. Needed by helpers that pair
		// `fetch` with a timeout (see generateConsentHandler).
		AbortController,
		AbortSignal,
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

	// Only `generate` gets outbound HTTP — validate/meetsRequirements/getSave
	// stay pure. Fetch itself is still gated by the allowlist inside the wrapper.
	if (functionName === "generate") {
		const scopedFetch = makeScopedFetch();
		if (scopedFetch) {
			sandbox.fetch = scopedFetch;
			if (typeof globalThis.URL === "function") sandbox.URL = globalThis.URL;
			if (typeof globalThis.URLSearchParams === "function") {
				sandbox.URLSearchParams = globalThis.URLSearchParams;
			}
			if (typeof globalThis.Headers === "function") {
				sandbox.Headers = globalThis.Headers;
			}
			if (typeof globalThis.Request === "function") {
				sandbox.Request = globalThis.Request;
			}
			if (typeof globalThis.Response === "function") {
				sandbox.Response = globalThis.Response;
			}
		}
	}

	return { sandbox, logs };
}

// Handle messages from main thread
parentPort?.on("message", async (message) => {
	const { id, code, functionName, args, timeout } = message;
	const startTime = Date.now();

	try {
		// Create fresh sandbox for each execution
		const { sandbox, logs } = createSandbox(functionName);

		// Create VM context with timeout
		const context = vm.createContext(sandbox);

		// Compile and run the code with timeout
		const script = new vm.Script(code, {
			filename: `user-function-${id}.js`,
			timeout: timeout || 5000,
		});

		// Execute the script
		script.runInContext(context, {
			timeout: timeout || 45000,
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
