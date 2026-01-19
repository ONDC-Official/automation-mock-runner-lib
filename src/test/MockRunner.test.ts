/**
 * Tests for MockRunner class - ONDC Automation Mock Runner
 */

import { createOptimizedMockConfig } from "../lib/configHelper";
import { MockRunner } from "../lib/MockRunner";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";

describe("MockRunner", () => {
	let mockRunner: MockRunner;
	let mockConfig: MockPlaygroundConfigType;

	beforeEach(async () => {
		mockConfig = {
			meta: {
				domain: "ONDC:TRV14",
				version: "2.0.0",
				flowId: "testing",
			},
			transaction_data: {
				transaction_id: "e9e0b5cb-3f15-48a1-9d86-d4d643f0909d",
				latest_timestamp: "1970-01-01T00:00:00.000Z",
			},
			steps: [],
			transaction_history: [],
			validationLib: "",
			helperLib: "",
		};
		try {
			mockRunner = new MockRunner(mockConfig);
			mockRunner
				.getConfig()
				.steps.push(mockRunner.getDefaultStep("search", "search_0"));
			mockRunner = new MockRunner(
				await createOptimizedMockConfig(mockRunner.getConfig()),
			);
		} catch (error) {
			throw error;
		}
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("Constructor", () => {
		it("should create MockRunner with valid config", () => {
			expect(mockRunner).toBeDefined();
			expect(mockRunner).toBeInstanceOf(MockRunner);
		});
	});

	describe("Config Validation", () => {
		it("should validate correct config successfully", () => {
			const validation = mockRunner.validateConfig();
			expect(validation.success).toBe(true);
			expect(validation.errors).toBeUndefined();
		});

		it("should detect validation errors in invalid config", () => {
			expect(() => {
				new MockRunner({
					meta: { domain: "", version: "", flowId: "" },
					transaction_data: {
						transaction_id: "",
						latest_timestamp: "",
						bap_id: "",
						bap_uri: "invalid-url",
						bpp_id: "",
						bpp_uri: "invalid-url",
					},
					steps: [],
					transaction_history: [],
					validationLib: "",
					helperLib: "",
				});
			}).toThrow();
		});
	});

	describe("Generate Payload", () => {
		it("should generate payload successfully", async () => {
			const result = await mockRunner.runGeneratePayload("search_0", {
				category: "Electronics",
			});
			expect(result).toBeDefined();
			expect(result.success).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.timestamp).toBeDefined();
			expect(result.result.context).toBeDefined();
			expect(result.result.context.transaction_id).toBe(
				mockConfig.transaction_data.transaction_id,
			);
			expect(result.result.context.message_id).toBeDefined();
			expect(result.result.context.timestamp).toBeDefined();
			expect(result.result.message).toBeDefined();
			expect(typeof result.executionTime).toBe("number");
		});

		it("should fail with non-existent action ID", async () => {
			const result = await mockRunner.runGeneratePayload("non-existent", {});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.message).toContain("not found");
		});
	});

	describe("Validate Payload", () => {
		it("should validate payload successfully", async () => {
			const targetPayload = {
				context: { domain: "retail", action: "search" },
				message: {
					intent: { category: { descriptor: { name: "Electronics" } } },
				},
			};

			const result = await mockRunner.runValidatePayload(
				"search_0",
				targetPayload,
			);

			expect(result).toBeDefined();
			expect(result.success).toBe(true);
		});

		it("should fail validation with invalid action ID", async () => {
			const result = await mockRunner.runValidatePayload("invalid-id", {});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.name).toBe("PayloadValidationError");
		});
	});

	describe("Context Generation", () => {
		it("should generate context for search action (v2.0)", () => {
			const context = mockRunner.generateContext("search_0", "search");

			expect(context).toBeDefined();
			expect(context.domain).toBe("ONDC:TRV14");
			expect(context.action).toBe("search");
			expect(context.transaction_id).toBe(
				"e9e0b5cb-3f15-48a1-9d86-d4d643f0909d",
			);
			expect(context.message_id).toBeDefined();
			expect(context.timestamp).toBeDefined();
			expect(context.bap_id).toBe("");
			expect(context.bap_uri).toBe("");

			// v2.0 specific fields
			expect(context.version).toBe("2.0.0");
			expect(context.location).toBeDefined();
			expect(context.location.country.code).toBe("IND");

			// Search action should not have BPP details
			expect(context.bpp_id).toBeUndefined();
			expect(context.bpp_uri).toBeUndefined();
		});

		it("should generate context for non-search action", () => {
			// Add a select step first
			mockConfig.steps.push(mockRunner.getDefaultStep("select", "select_0"));

			const context = mockRunner.generateContext("select_0", "select");

			expect(context.bpp_id).toBe("");
			expect(context.bpp_uri).toBe("");
			expect(context.action).toBe("select");
		});
	});

	describe("Session Data Management", () => {
		it("should extract session data correctly", async () => {
			const sessionData = await mockRunner.getSessionDataUpToStep(0);
			expect(sessionData).toEqual({});
		});

		it("should handle invalid step indices", async () => {
			const sessionData = await mockRunner.getSessionDataUpToStep(-1);
			expect(sessionData).toEqual({});
		});
	});

	describe("Eval type in saveData", () => {
		it("should evaluate expressions in saveData correctly", async () => {
			const fun = MockRunner.encodeBase64(`async function getSave(payload){
				console.log('Payload in getSave:', payload);
				return payload.a + payload.b;
			}`);
			const ob = {
				a: 1,
				b: 2,
			};
			const res = await MockRunner.runGetSave(ob, fun);
			expect(res.result).toBe(ob.a + ob.b);
		});

		it("should timeout for long-running getSave functions", async () => {
			const longRunningFunction =
				MockRunner.encodeBase64(`async function getSave(payload){
				console.log('Starting long-running operation...');
				// Simulate a long-running operation that takes more than 3 seconds
				await new Promise(resolve => setTimeout(resolve, 4000));
				console.log('Long-running operation completed');
				return payload.result;
			}`);

			const payload = {
				result: "This should timeout",
			};

			// This should timeout and return an error result
			const res = await MockRunner.runGetSave(payload, longRunningFunction);

			console.log("Timeout test result:", JSON.stringify(res, null, 2));

			// Expect the operation to fail due to timeout
			expect(res.success).toBe(false);
			expect(res.error).toBeDefined();
			if (res.error) {
				expect(
					res.error.message.toLowerCase().includes("timeout") ||
						res.error.message.includes("Timeout") ||
						res.error.message.includes("TIMEOUT") ||
						res.error.name.toLowerCase().includes("timeout"),
				).toBe(true);
			}
		}, 10000); // Set Jest timeout to 10 seconds to allow for the timeout to occur
	});

	describe("Helper Library Functionality", () => {
		it("should successfully use helper library functions in generate code", async () => {
			// Create a helper library with utility functions
			const helperLib = MockRunner.encodeBase64(`
				function formatCurrency(amount) {
					return "₹" + amount.toFixed(2);
				}
				
				function calculateDiscount(price, discountPercent) {
					return price - (price * discountPercent / 100);
				}
			`);

			// Create generate code that uses helper library functions
			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					const originalPrice = 1000;
					const discountedPrice = calculateDiscount(originalPrice, 10);
					
					payload.message = {
						price: formatCurrency(originalPrice),
						discountedPrice: formatCurrency(discountedPrice),
						savings: formatCurrency(originalPrice - discountedPrice)
					};
					
					return payload;
				}
			`);

			// Create config with helper library
			const configWithHelper: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-123",
					latest_timestamp: "2024-01-01T00:00:00.000Z",
					bap_id: "test-bap",
					bap_uri: "https://test-bap.com",
				},
				steps: [
					{
						api: "select",
						action_id: "select_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test helper library",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: helperLib,
			};

			const runner = new MockRunner(configWithHelper, true);
			const result = await runner.runGeneratePayload("select_0", {});

			expect(result.success).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result.message).toBeDefined();
			expect(result.result.message.price).toBe("₹1000.00");
			expect(result.result.message.discountedPrice).toBe("₹900.00");
			expect(result.result.message.savings).toBe("₹100.00");
		});

		it("should work correctly when helper library is empty string", async () => {
			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					payload.message = { test: "works without helper" };
					return payload;
				}
			`);

			const configNoHelper: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "no-helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-456",
					latest_timestamp: "2024-01-01T00:00:00.000Z",
				},
				steps: [
					{
						api: "search",
						action_id: "search_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test without helper library",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: "",
			};

			const runner = new MockRunner(configNoHelper, true);
			const result = await runner.runGeneratePayload("search_0", {});

			expect(result.success).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result.message.test).toBe("works without helper");
		});

		it("should work correctly when helper library is null or undefined in config", async () => {
			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					payload.message = { test: "works with null helper" };
					return payload;
				}
			`);

			// Test with empty string (same as undefined behavior)
			const configNullHelper: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "null-helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-789",
					latest_timestamp: "2024-01-01T00:00:00.000Z",
				},
				steps: [
					{
						api: "search",
						action_id: "search_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test with null/undefined helper library",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: "",
			};

			const runner = new MockRunner(configNullHelper, true);
			const result = await runner.runGeneratePayload("search_0", {});

			expect(result.success).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result.message.test).toBe("works with null helper");
		});

		it("should handle invalid base64 in helper library gracefully", async () => {
			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					payload.message = { test: "should still work" };
					return payload;
				}
			`);

			const configInvalidHelper: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "invalid-helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-invalid",
					latest_timestamp: "2024-01-01T00:00:00.000Z",
				},
				steps: [
					{
						api: "search",
						action_id: "search_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test with invalid helper library",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: "invalid-base64-@#$%",
			};

			const runner = new MockRunner(configInvalidHelper, true);
			const result = await runner.runGeneratePayload("search_0", {});

			// Should still execute successfully with empty helper lib
			expect(result.success).toBe(true);
			expect(result.result).toBeDefined();
			expect(result.result.message.test).toBe("should still work");
		});

		it("should combine helper library with multiple utility functions", async () => {
			// Helper library with multiple utilities
			const helperLib = MockRunner.encodeBase64(`
				const CONSTANTS = {
					TAX_RATE: 0.18,
					SHIPPING_COST: 50
				};
				
				function calculateTax(amount) {
					return amount * CONSTANTS.TAX_RATE;
				}
				
				function calculateTotal(subtotal) {
					const tax = calculateTax(subtotal);
					return subtotal + tax + CONSTANTS.SHIPPING_COST;
				}
				
				function formatDate(dateStr) {
					return new Date(dateStr).toLocaleDateString('en-IN');
				}
			`);

			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					const subtotal = 1000;
					const tax = calculateTax(subtotal);
					const total = calculateTotal(subtotal);
					
					payload.message = {
						subtotal: subtotal,
						tax: tax,
						shipping: 50,
						total: total,
						orderDate: formatDate(payload.context.timestamp)
					};
					
					return payload;
				}
			`);

			const config: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "multi-helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-multi",
					latest_timestamp: "2024-01-15T00:00:00.000Z",
				},
				steps: [
					{
						api: "init",
						action_id: "init_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test multiple helper functions",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: helperLib,
			};

			const runner = new MockRunner(config, true);
			const result = await runner.runGeneratePayload("init_0", {});

			expect(result.success).toBe(true);
			expect(result.result.message).toBeDefined();
			expect(result.result.message.subtotal).toBe(1000);
			expect(result.result.message.tax).toBe(180); // 18% of 1000
			expect(result.result.message.shipping).toBe(50);
			expect(result.result.message.total).toBe(1230); // 1000 + 180 + 50
			expect(result.result.message.orderDate).toBeDefined();
		});

		it("should handle syntax errors in helper library", async () => {
			// Helper library with syntax error
			const helperLibWithError = MockRunner.encodeBase64(`
				function brokenFunction( {
					// Missing closing parenthesis
					return "broken";
				}
			`);

			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					payload.message = { test: "value" };
					return payload;
				}
			`);

			const config: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "error-helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-error",
					latest_timestamp: "2024-01-01T00:00:00.000Z",
				},
				steps: [
					{
						api: "search",
						action_id: "search_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test helper library with syntax error",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: helperLibWithError,
			};

			const runner = new MockRunner(config, true);
			const result = await runner.runGeneratePayload("search_0", {});

			// Should fail due to syntax error in combined code
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should allow helper library to access sessionData through generate function", async () => {
			const helperLib = MockRunner.encodeBase64(`
				function getUserDiscount(userType) {
					const discounts = {
						'premium': 20,
						'regular': 10,
						'new': 5
					};
					return discounts[userType] || 0;
				}
			`);

			const generateCode = MockRunner.encodeBase64(`
				async function generate(payload, sessionData) {
					const userType = sessionData.user_inputs?.userType || 'new';
					const discount = getUserDiscount(userType);
					
					payload.message = {
						userType: userType,
						discountPercent: discount
					};
					
					return payload;
				}
			`);

			const config: MockPlaygroundConfigType = {
				meta: {
					domain: "ONDC:RET10",
					version: "2.0.0",
					flowId: "session-helper-test",
				},
				transaction_data: {
					transaction_id: "test-txn-session",
					latest_timestamp: "2024-01-01T00:00:00.000Z",
				},
				steps: [
					{
						api: "select",
						action_id: "select_0",
						owner: "BAP",
						responseFor: null,
						unsolicited: false,
						description: "Test helper with session data",
						mock: {
							generate: generateCode,
							validate: MockRunner.encodeBase64(
								"async function validate(payload, sessionData) { return { isValid: true, errors: [], warnings: [] }; }",
							),
							requirements: MockRunner.encodeBase64(
								"async function meetsRequirements(sessionData) { return { meets: true, reasons: [] }; }",
							),
							defaultPayload: {
								context: {},
								message: {},
							},
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [],
				validationLib: "",
				helperLib: helperLib,
			};

			const runner = new MockRunner(config, true);
			const result = await runner.runGeneratePayload("select_0", {
				userType: "premium",
			});

			expect(result.success).toBe(true);
			expect(result.result.message.userType).toBe("premium");
			expect(result.result.message.discountPercent).toBe(20);
		});
	});
});
