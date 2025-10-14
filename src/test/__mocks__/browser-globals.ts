/**
 * Mock browser environment for testing BrowserRunner
 */

// Mock browser globals
const mockBrowserGlobals = () => {
	// Mock Worker class
	class MockWorker extends EventTarget {
		public messageHandlers: Set<(event: MessageEvent) => void> = new Set();

		constructor(url: string | URL) {
			super();
			// Simulate worker creation delay
			setTimeout(() => {
				this.dispatchEvent(new Event("load"));
			}, 10);
		}

		postMessage(data: any) {
			// Simulate worker message processing
			setTimeout(async () => {
				const startTime = Date.now();
				try {
					const { id, code, functionName, args } = data;

					// Execute the code in current context (simulating worker)
					const logs: string[] = [];

					// Mock console for capturing logs
					const mockConsole = {
						log: (...logArgs: any[]) => logs.push(logArgs.join(" ")),
						error: (...logArgs: any[]) => logs.push(logArgs.join(" ")),
						warn: (...logArgs: any[]) => logs.push(logArgs.join(" ")),
					};

					// Create execution context
					const context = {
						console: mockConsole,
						// Add other safe globals as needed
						Math,
						Date,
						JSON,
						String,
						Number,
						Boolean,
						Array,
						Object,
						Promise,
						setTimeout,
						clearTimeout,
					};

					// Execute code with mock context
					const fn = new Function(
						...Object.keys(context),
						code + `; return ${functionName};`,
					);

					const userFunction = fn(...Object.values(context));

					if (typeof userFunction !== "function") {
						throw new Error(`${functionName} is not a function`);
					}

					// Handle both sync and async functions
					let result = userFunction(...args);

					// If result is a promise, await it
					if (result && typeof result.then === "function") {
						result = await result;
					}

					const executionTime = Date.now() - startTime;

					// Simulate async response
					this.dispatchEvent(
						new MessageEvent("message", {
							data: {
								id,
								success: true,
								result,
								logs,
								executionTime,
							},
						}),
					);
				} catch (error) {
					const executionTime = Date.now() - startTime;
					this.dispatchEvent(
						new MessageEvent("message", {
							data: {
								id: data.id,
								success: false,
								error: {
									message: (error as Error).message,
									name: (error as Error).name,
									stack: (error as Error).stack,
								},
								logs: [],
								executionTime,
							},
						}),
					);
				}
			}, 50); // Simulate network delay
		}

		terminate() {
			// Clean up
			this.messageHandlers.clear();
		}

		addEventListener(type: string, listener: EventListener) {
			super.addEventListener(type, listener);
		}

		removeEventListener(type: string, listener: EventListener) {
			super.removeEventListener(type, listener);
		}
	}

	// Mock Blob for worker URL creation
	class MockBlob {
		constructor(
			public content: string[],
			public options: any = {},
		) {}
	}

	// Mock URL for createObjectURL
	const MockURL = {
		createObjectURL: (blob: MockBlob) => {
			return "blob:mock-url-" + Math.random().toString(36).substr(2, 9);
		},
		revokeObjectURL: (url: string) => {
			// Mock cleanup
		},
	};

	return {
		Worker: MockWorker,
		Blob: MockBlob,
		URL: MockURL,
		window: {}, // Mock window object
		document: {}, // Mock document object
		performance: {
			now: () => Date.now(),
		},
	};
};

export { mockBrowserGlobals };
