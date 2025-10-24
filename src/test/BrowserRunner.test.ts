/**
 * Tests for BrowserRunner - Mock browser environment testing
 */

import { BrowserRunner } from "../lib/runners/browser-runner";
import { getFunctionSchema } from "../lib/constants/function-registry";
import { mockBrowserGlobals } from "./__mocks__/browser-globals";

// Setup mock browser environment
const browserMocks = mockBrowserGlobals();

// Mock browser globals for testing
Object.assign(global, {
	Worker: browserMocks.Worker,
	Blob: browserMocks.Blob,
	URL: browserMocks.URL,
	window: browserMocks.window,
	document: browserMocks.document,
	performance: browserMocks.performance,
});

describe("BrowserRunner", () => {
	let browserRunner: BrowserRunner;

	beforeEach(() => {
		browserRunner = new BrowserRunner();
	});

	afterEach(() => {
		if (browserRunner) {
			browserRunner.terminate();
		}
	});

	describe("Constructor and Initialization", () => {
		it("should create BrowserRunner instance successfully", () => {
			expect(browserRunner).toBeDefined();
			expect(browserRunner).toBeInstanceOf(BrowserRunner);
		});
	});

	describe("Code Execution", () => {
		it("should execute simple generate function", async () => {
			const functionCode = `
           async function generate(defaultPayload, sessionData) {
          defaultPayload.message = { test: 'browser-execution' };
          return defaultPayload;
        }
      `;

			const schema = getFunctionSchema("generate");
			const args = [{ context: {} }, {}];

			const result = await browserRunner.execute(functionCode, schema, args);

			expect(result.success).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result.message.test).toBe("browser-execution");
			expect(result.timestamp).toBeDefined();
			expect(typeof result.executionTime).toBe("number");
		});

		it("should execute validate function with return value", async () => {
			const functionCode = `
        function validate(targetPayload, sessionData) {
          if (targetPayload.message && targetPayload.message.valid) {
            return { valid: true, code: 200, description: 'Valid payload' };
          }
          return { valid: false, code: 400, description: 'Invalid payload' };
        }
      `;

			const schema = getFunctionSchema("validate");
			const args = [{ message: { valid: true } }, {}];

			const result = await browserRunner.execute(functionCode, schema, args);

			expect(result.success).toBe(true);
			expect(result.result.valid).toBe(true);
			expect(result.result.code).toBe(200);
		});

		it("should execute requirements function", async () => {
			const functionCode = `
		    function meetsRequirements(sessionData) {
		      return { valid: true, code: 200, description: 'Requirements met' };
		    }
		  `;

			const schema = getFunctionSchema("meetsRequirements");
			const args = [{}];

			const result = await browserRunner.execute(functionCode, schema, args);

			expect(result.success).toBe(true);
			expect(result.result.valid).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle syntax errors", async () => {
			const invalidCode = `
	    function generate(defaultPayload, sessionData) {
	      // Missing closing brace and return
	      defaultPayload.message = { invalid: syntax
	  `;

			const schema = getFunctionSchema("generate");
			const args = [{}, {}];

			const result = await browserRunner.execute(invalidCode, schema, args);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.name).toBe("ValidationError");
		});

		it("should handle runtime errors", async () => {
			const errorCode = `
	    async function generate(defaultPayload, sessionData) {
	      throw new Error('Test runtime error');
	    }
	  `;

			const schema = getFunctionSchema("generate");
			const args = [{}, {}];

			const result = await browserRunner.execute(errorCode, schema, args);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.message).toContain("Test runtime error");
		});

		it("should handle function not found error", async () => {
			const wrongFunctionCode = `
	    async function wrongName(defaultPayload, sessionData) {
	      return defaultPayload;
	    }
	  `;

			const schema = getFunctionSchema("generate");
			const args = [{}, {}];

			const result = await browserRunner.execute(
				wrongFunctionCode,
				schema,
				args,
			);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.message).toContain("generate is not defined");
		});

		it("should handle runtime errors in functions", async () => {
			const errorCode = `
	    function validate(targetPayload, sessionData) {
	      throw new Error('Test runtime error in validate');
		  return { valid: true, code: 200, description: 'Should not reach here' };
	    }
	  `;

			const schema = getFunctionSchema("validate");
			const args = [{}, {}];

			const result = await browserRunner.execute(errorCode, schema, args);
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.message).toContain("Test runtime error in validate");
		});
	});

	describe("Security Features", () => {
		it("should block dangerous function calls", async () => {
			const dangerousCode = `
	    function validate(targetPayload, sessionData) {
	      eval('console.log("dangerous code")');
	      return { valid: true, code: 200, description: 'Should not reach here' };
	    }
	  `;

			const schema = getFunctionSchema("validate");
			const args = [{}, {}];

			const result = await browserRunner.execute(dangerousCode, schema, args);
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should block access to forbidden properties", async () => {
			const dangerousCode = `
	    function validate(targetPayload, sessionData) {
	      localStorage.setItem('test', 'value');
	      return { valid: true, code: 200, description: 'Should not reach here' };
	    }
	  `;

			const schema = getFunctionSchema("validate");
			const args = [{}, {}];

			const result = await browserRunner.execute(dangerousCode, schema, args);

			expect(result.success).toBe(false);
		});
	});

	describe("Console Logging", () => {
		it("should capture console logs", async () => {
			const functionWithLogs = `
	    async function generate(defaultPayload, sessionData) {
	      console.log('Test log message');
	      console.warn('Test warning');
	      defaultPayload.message = { logged: true };
	      return defaultPayload;
	    }
	  `;

			const schema = getFunctionSchema("generate");
			const args = [{}, {}];

			const result = await browserRunner.execute(
				functionWithLogs,
				schema,
				args,
			);

			expect(result.success).toBe(true);
			expect(result.logs).toBeDefined();
		});
	});
});
