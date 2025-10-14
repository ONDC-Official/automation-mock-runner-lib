// /**
//  * Cross-environment integration tests for both Node and Browser runners
//  * These tests ensure both runners produce consistent results
//  */

// import { NodeRunner } from "../lib/runners/node-runner";
// import { BrowserRunner } from "../lib/runners/browser-runner";
// import { getFunctionSchema } from "../lib/constants/function-registry";
// import { mockBrowserGlobals } from "./__mocks__/browser-globals";
// import { BaseCodeRunner } from "../lib/runners/base-runner";

// // Setup mock browser environment for BrowserRunner tests
// const browserMocks = mockBrowserGlobals();
// Object.assign(global, {
// 	Worker: browserMocks.Worker,
// 	Blob: browserMocks.Blob,
// 	URL: browserMocks.URL,
// 	window: browserMocks.window,
// 	document: browserMocks.document,
// 	performance: browserMocks.performance,
// });

// describe("Cross-Environment Runner Tests", () => {
// 	let nodeRunner: NodeRunner;
// 	let browserRunner: BrowserRunner;

// 	beforeEach(() => {
// 		nodeRunner = new NodeRunner();
// 		browserRunner = new BrowserRunner();
// 	});

// 	afterEach(() => {
// 		nodeRunner?.terminate();
// 		browserRunner?.terminate();
// 	});

// 	const testCases = [
// 		{
// 			name: "Simple payload generation",
// 			functionCode: `
//         async function generate(defaultPayload, sessionData) {
//           defaultPayload.message = {
//             test: 'cross-environment',
//             timestamp: new Date().toISOString()
//           };
//           return defaultPayload;
//         }
//       `,
// 			functionType: "generate" as const,
// 			args: [{ context: {} }, {}],
// 			validate: (result: any) => {
// 				expect(result.message.test).toBe("cross-environment");
// 				expect(result.message.timestamp).toBeDefined();
// 			},
// 		},
// 		{
// 			name: "Validation with complex logic",
// 			functionCode: `
//         function validate(targetPayload, sessionData) {
//           const hasMessage = targetPayload && targetPayload.message;
//           const hasRequiredField = hasMessage && targetPayload.message.required;

//           if (!hasRequiredField) {
//             return {
//               valid: false,
//               code: 400,
//               description: 'Missing required field'
//             };
//           }

//           return {
//             valid: true,
//             code: 200,
//             description: 'Validation passed'
//           };
//         }
//       `,
// 			functionType: "validate" as const,
// 			args: [{ message: { required: true } }, {}],
// 			validate: (result: any) => {
// 				expect(result.valid).toBe(true);
// 				expect(result.code).toBe(200);
// 			},
// 		},
// 		{
// 			name: "Requirements check with session data",
// 			functionCode: `
//         function meetsRequirements(sessionData) {
//           const hasUserData = sessionData && sessionData.user_inputs;
//           const hasRequiredAuth = hasUserData && sessionData.user_inputs.authenticated;

//           if (!hasRequiredAuth) {
//             return {
//               valid: false,
//               code: 401,
//               description: 'Authentication required'
//             };
//           }

//           return {
//             valid: true,
//             code: 200,
//             description: 'Requirements met'
//           };
//         }
//       `,
// 			functionType: "meetsRequirements" as const,
// 			args: [{ user_inputs: { authenticated: true } }],
// 			validate: (result: any) => {
// 				expect(result.valid).toBe(true);
// 				expect(result.code).toBe(200);
// 			},
// 		},
// 	];

// 	describe.each(["node", "browser"])("%s Runner Consistency", (runnerType) => {
// 		let runner: BaseCodeRunner;

// 		beforeEach(() => {
// 			runner = runnerType === "node" ? nodeRunner : browserRunner;
// 		});

// 		testCases.forEach((testCase) => {
// 			it(`should handle ${testCase.name}`, async () => {
// 				const schema = getFunctionSchema(testCase.functionType);
// 				const result = await runner.execute(
// 					testCase.functionCode,
// 					schema,
// 					testCase.args,
// 				);

// 				expect(result.success).toBe(true);
// 				expect(result.result).toBeDefined();
// 				expect(result.timestamp).toBeDefined();
// 				expect(typeof result.executionTime).toBe("number");

// 				testCase.validate(result.result);
// 			});
// 		});
// 	});

// 	describe("Cross-Environment Consistency", () => {
// 		testCases.forEach((testCase) => {
// 			it(`should produce consistent results for ${testCase.name}`, async () => {
// 				const schema = getFunctionSchema(testCase.functionType);

// 				// Execute in both environments
// 				const [nodeResult, browserResult] = await Promise.all([
// 					nodeRunner.execute(testCase.functionCode, schema, testCase.args),
// 					browserRunner.execute(testCase.functionCode, schema, testCase.args),
// 				]);

// 				// Both should succeed
// 				expect(nodeResult.success).toBe(true);
// 				expect(browserResult.success).toBe(true);

// 				// Results should be functionally equivalent
// 				// (timestamps might differ slightly, so we test structure)
// 				expect(typeof nodeResult.result).toBe(typeof browserResult.result);

// 				if (
// 					typeof nodeResult.result === "object" &&
// 					nodeResult.result !== null
// 				) {
// 					// Compare object structure (excluding timestamp fields)
// 					const nodeKeys = Object.keys(nodeResult.result);
// 					const browserKeys = Object.keys(browserResult.result);
// 					expect(nodeKeys.sort()).toEqual(browserKeys.sort());
// 				}
// 			});
// 		});
// 	});

// 	describe("Error Handling Consistency", () => {
// 		const errorCases = [
// 			{
// 				name: "Syntax error",
// 				code: `
//           function generate(defaultPayload, sessionData) {
//             // Missing closing brace
//             return defaultPayload
//         `,
// 				functionType: "generate" as const,
// 				args: [{}, {}],
// 			},
// 			{
// 				name: "Runtime error",
// 				code: `
//           function validate(targetPayload, sessionData) {
//             throw new Error('Test error');
//           }
//         `,
// 				functionType: "validate" as const,
// 				args: [{}, {}],
// 			},
// 		];

// 		errorCases.forEach((errorCase) => {
// 			it(`should handle ${errorCase.name} consistently`, async () => {
// 				const schema = getFunctionSchema(errorCase.functionType);

// 				const [nodeResult, browserResult] = await Promise.all([
// 					nodeRunner.execute(errorCase.code, schema, errorCase.args),
// 					browserRunner.execute(errorCase.code, schema, errorCase.args),
// 				]);

// 				// Both should fail
// 				expect(nodeResult.success).toBe(false);
// 				expect(browserResult.success).toBe(false);

// 				// Both should have error information
// 				expect(nodeResult.error).toBeDefined();
// 				expect(browserResult.error).toBeDefined();
// 			});
// 		});
// 	});
// });
