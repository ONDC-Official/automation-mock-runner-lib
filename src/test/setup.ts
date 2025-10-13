/**
 * Jest setup file for ONDC Mock Runner tests
 */

// Global test configuration
beforeAll(() => {
	// Set up any global test configuration
	process.env.NODE_ENV = "test";
});

afterAll(() => {
	// Clean up after all tests
});

beforeEach(() => {
	// Reset any mocks or state before each test
	jest.clearAllMocks();
});

afterEach(() => {
	// Clean up after each test
});

// Extend Jest matchers
expect.extend({
	toBeValidExecutionResult(received) {
		const pass =
			received &&
			typeof received === "object" &&
			typeof received.success === "boolean" &&
			typeof received.timestamp === "string" &&
			Array.isArray(received.logs) &&
			received.validation &&
			typeof received.validation.isValid === "boolean";

		if (pass) {
			return {
				message: () => `Expected ${received} not to be a valid ExecutionResult`,
				pass: true,
			};
		} else {
			return {
				message: () => `Expected ${received} to be a valid ExecutionResult`,
				pass: false,
			};
		}
	},
});
