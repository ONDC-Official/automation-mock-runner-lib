/**
 * Tests for MockRunner class - ONDC Automation Mock Runner
 */

import { MockRunner } from "../lib/MockRunner";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";

describe("MockRunner", () => {
	let mockRunner: MockRunner;
	let mockConfig: MockPlaygroundConfigType;

	beforeEach(() => {
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
			mockConfig.steps.push(mockRunner.getDefaultStep("search", "search_0"));
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
			console.log(JSON.stringify(res, null, 2));
			console.log(Object.keys(ob).length);
			expect(res.result).toBe(ob.a + ob.b);
		});
	});
});
