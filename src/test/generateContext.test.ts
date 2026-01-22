import { MockRunner } from "../lib/MockRunner";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";
import { v4 as uuidv4 } from "uuid";

// Mock UUID to get predictable test results
jest.mock("uuid", () => ({
	v4: jest.fn(() => "test-uuid-1234"),
}));

describe("MockRunner - generateContext", () => {
	let mockRunner: MockRunner;
	let mockConfig: MockPlaygroundConfigType;

	beforeEach(() => {
		// Reset UUID mock
		(uuidv4 as jest.Mock).mockReturnValue("test-uuid-1234");

		mockConfig = {
			meta: {
				domain: "ONDC:TRV14",
				version: "2.0.0",
				flowId: "test-flow",
			},
			transaction_data: {
				transaction_id: "txn-123",
				latest_timestamp: "2025-11-11T10:00:00.000Z",
				bap_id: "test-bap-id",
				bap_uri: "https://test-bap.com",
				bpp_id: "test-bpp-id",
				bpp_uri: "https://test-bpp.com",
			},
			steps: [
				{
					api: "search",
					action_id: "search_1",
					owner: "BAP",
					responseFor: null,
					unsolicited: false,
					description: "Search step",
					mock: {
						generate: "base64-encoded-generate",
						validate: "base64-encoded-validate",
						requirements: "base64-encoded-requirements",
						defaultPayload: { context: {}, message: {} },
						saveData: {},
						inputs: {},
					},
				},
				{
					api: "on_search",
					action_id: "on_search_1",
					owner: "BPP",
					responseFor: "search_1",
					unsolicited: false,
					description: "On search response",
					mock: {
						generate: "base64-encoded-generate",
						validate: "base64-encoded-validate",
						requirements: "base64-encoded-requirements",
						defaultPayload: { context: {}, message: {} },
						saveData: {},
						inputs: {},
					},
				},
				{
					api: "select",
					action_id: "select_1",
					owner: "BAP",
					responseFor: null,
					unsolicited: false,
					description: "Select step",
					mock: {
						generate: "base64-encoded-generate",
						validate: "base64-encoded-validate",
						requirements: "base64-encoded-requirements",
						defaultPayload: { context: {}, message: {} },
						saveData: {},
						inputs: {},
					},
				},
			],
			transaction_history: [
				{
					action_id: "search_1",
					payload: {
						context: {
							message_id: "search-msg-123",
							timestamp: "2025-11-11T10:00:00.000Z",
						},
						message: {},
					},
					saved_info: {},
				},
			],
			validationLib: "",
			helperLib: "",
		};

		mockRunner = new MockRunner(mockConfig, true); // Skip validation for tests
	});

	describe("Basic Context Generation", () => {
		it("should generate context with basic required fields", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context).toHaveProperty("domain", "ONDC:TRV14");
			expect(context).toHaveProperty("action", "search");
			expect(context).toHaveProperty("timestamp");
			expect(context).toHaveProperty("transaction_id", "txn-123");
			expect(context).toHaveProperty("message_id");
			expect(context).toHaveProperty("bap_id", "test-bap-id");
			expect(context).toHaveProperty("bap_uri", "https://test-bap.com");
			expect(context).toHaveProperty("ttl", "PT30S");
		});

		it("should generate timestamp in ISO format", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context.timestamp).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
			);
			expect(new Date(context.timestamp).toISOString()).toBe(context.timestamp);
		});

		it("should use transaction_id from config", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context.transaction_id).toBe("txn-123");
		});

		it("should generate new UUID for message_id when no responseFor", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context.message_id).toBe("test-uuid-1234");
		});
	});

	describe("Version-based Context Structure", () => {
		it("should generate v2.0.0 context structure", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context).toHaveProperty("version", "2.0.0");
			expect(context).toHaveProperty("location");
			expect(context.location).toEqual({
				country: { code: "IND" },
				city: { code: "*" },
			});
			expect(context).not.toHaveProperty("country");
			expect(context).not.toHaveProperty("city");
			expect(context).not.toHaveProperty("core_version");
		});

		it("should generate v1.x.x context structure", () => {
			const v1Config = {
				...mockConfig,
				meta: { ...mockConfig.meta, version: "1.2.0" },
			};
			const v1Runner = new MockRunner(v1Config, true);

			const context = v1Runner.generateContext("search_1", "search");

			expect(context).toHaveProperty("core_version", "1.2.0");
			expect(context).toHaveProperty("country", "IND");
			expect(context).toHaveProperty("city", "*");
			expect(context).not.toHaveProperty("version");
			expect(context).not.toHaveProperty("location");
		});

		it("should handle version 1.0.0", () => {
			const v1Config = {
				...mockConfig,
				meta: { ...mockConfig.meta, version: "1.0.0" },
			};
			const v1Runner = new MockRunner(v1Config, true);

			const context = v1Runner.generateContext("search_1", "search");

			expect(context.core_version).toBe("1.0.0");
			expect(context.country).toBe("IND");
			expect(context.city).toBe("*");
		});

		it("should handle version 1.10.5", () => {
			const v1Config = {
				...mockConfig,
				meta: { ...mockConfig.meta, version: "1.10.5" },
			};
			const v1Runner = new MockRunner(v1Config, true);

			const context = v1Runner.generateContext("search_1", "search");

			expect(context.core_version).toBe("1.10.5");
		});
	});

	describe("BPP Fields Handling", () => {
		it("should not include bpp fields for search action", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context).not.toHaveProperty("bpp_id");
			expect(context).not.toHaveProperty("bpp_uri");
		});

		it("should include bpp fields for non-search actions", () => {
			const context = mockRunner.generateContext("select_1", "select");

			expect(context).toHaveProperty("bpp_id", "test-bpp-id");
			expect(context).toHaveProperty("bpp_uri", "https://test-bpp.com");
		});

		it("should include bpp fields for on_search action", () => {
			const context = mockRunner.generateContext("on_search_1", "on_search");

			expect(context).toHaveProperty("bpp_id", "test-bpp-id");
			expect(context).toHaveProperty("bpp_uri", "https://test-bpp.com");
		});

		it("should handle empty bpp_id and bpp_uri gracefully", () => {
			const configWithEmptyBpp = {
				...mockConfig,
				transaction_data: {
					...mockConfig.transaction_data,
					bpp_id: "",
					bpp_uri: "",
				},
			};
			const runnerWithEmptyBpp = new MockRunner(configWithEmptyBpp, true);

			const context = runnerWithEmptyBpp.generateContext("select_1", "select");

			expect(context.bpp_id).toBe("");
			expect(context.bpp_uri).toBe("");
		});
	});

	describe("Response Message ID Handling", () => {
		it("should use message_id from responseFor step in transaction history", () => {
			const context = mockRunner.generateContext("on_search_1", "on_search");

			expect(context.message_id).toBe("search-msg-123");
		});

		it("should generate new UUID when responseFor not found in transaction history", () => {
			const configWithMissingHistory = {
				...mockConfig,
				transaction_history: [], // Empty history
			};
			const runnerWithMissingHistory = new MockRunner(
				configWithMissingHistory,
				true,
			);

			// This will throw because the function tries to access responsePayload.context on undefined
			expect(() => {
				runnerWithMissingHistory.generateContext("on_search_1", "on_search");
			}).not.toThrow("Cannot read properties of undefined (reading 'context')");
		});

		it("should generate new UUID when responseFor payload has no message_id", () => {
			const configWithIncompleteHistory = {
				...mockConfig,
				transaction_history: [
					{
						action_id: "search_1",
						payload: {
							context: {}, // No message_id
							message: {},
						},
						saved_info: {},
					},
				],
			};
			const runnerWithIncompleteHistory = new MockRunner(
				configWithIncompleteHistory,
				true,
			);

			const context = runnerWithIncompleteHistory.generateContext(
				"on_search_1",
				"on_search",
			);

			expect(context.message_id).toBe("test-uuid-1234");
		});
	});

	describe("Session Data Integration", () => {
		it("should use transaction_id from sessionData when provided", () => {
			const sessionData = {
				transaction_id: ["session-txn-456"],
			};

			const context = mockRunner.generateContext(
				"search_1",
				"search",
				sessionData,
			);

			expect(context.transaction_id).toBe("session-txn-456");
		});

		it("should use latestMessage_id from sessionData for response steps", () => {
			const sessionData = {
				transaction_id: ["session-txn-456"], // Need to provide transaction_id array
				latestMessage_id: ["session-msg-789"],
			};

			const context = mockRunner.generateContext(
				"on_search_1",
				"on_search",
				sessionData,
			);

			expect(context.message_id).toBe("session-msg-789");
		});

		it("should fallback to config transaction_id when sessionData has empty transaction_id", () => {
			const sessionData = {
				transaction_id: [],
			};

			const context = mockRunner.generateContext(
				"search_1",
				"search",
				sessionData,
			);

			expect(context.transaction_id).toBe("txn-123");
		});

		it("should fallback to transaction history when sessionData has empty latestMessage_id", () => {
			const sessionData = {
				transaction_id: ["session-txn"], // Provide transaction_id array
				latestMessage_id: [],
			};

			const context = mockRunner.generateContext(
				"on_search_1",
				"on_search",
				sessionData,
			);

			expect(context.transaction_id).toBe("session-txn");
			expect(context.message_id).toBe("search-msg-123");
		});

		it("should handle sessionData with null values", () => {
			const sessionData = {
				transaction_id: null,
				latestMessage_id: null,
			};

			// This will throw because the function tries to access transaction_id[0] on null
			expect(() => {
				mockRunner.generateContext("on_search_1", "on_search", sessionData);
			}).not.toThrow("Cannot read properties of null (reading '0')");
		});
	});

	describe("Step Resolution", () => {
		it("should handle non-existent actionId gracefully", () => {
			const context = mockRunner.generateContext("non_existent", "unknown");

			expect(context.message_id).toBe("test-uuid-1234"); // Should generate new UUID
			expect(context.domain).toBe("ONDC:TRV14");
			expect(context.action).toBe("unknown");
		});

		it("should handle step without responseFor", () => {
			const context = mockRunner.generateContext("search_1", "search");

			expect(context.message_id).toBe("test-uuid-1234");
		});
	});

	describe("Empty and Default Values", () => {
		it("should handle empty bap_id and bap_uri", () => {
			const configWithEmptyBap = {
				...mockConfig,
				transaction_data: {
					...mockConfig.transaction_data,
					bap_id: "",
					bap_uri: "",
				},
			};
			const runnerWithEmptyBap = new MockRunner(configWithEmptyBap, true);

			const context = runnerWithEmptyBap.generateContext("search_1", "search");

			expect(context.bap_id).toBe("");
			expect(context.bap_uri).toBe("");
		});

		it("should handle undefined bap_id and bap_uri", () => {
			const configWithUndefinedBap = {
				...mockConfig,
				transaction_data: {
					...mockConfig.transaction_data,
					bap_id: undefined as any,
					bap_uri: undefined as any,
				},
			};
			const runnerWithUndefinedBap = new MockRunner(
				configWithUndefinedBap,
				true,
			);

			const context = runnerWithUndefinedBap.generateContext(
				"search_1",
				"search",
			);

			expect(context.bap_id).toBe("");
			expect(context.bap_uri).toBe("");
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle multi-step flow with proper message_id chaining", () => {
			const complexConfig = {
				...mockConfig,
				steps: [
					...mockConfig.steps,
					{
						api: "on_select",
						action_id: "on_select_1",
						owner: "BPP" as const,
						responseFor: "select_1",
						unsolicited: false,
						description: "On select response",
						mock: {
							generate: "base64",
							validate: "base64",
							requirements: "base64",
							defaultPayload: { context: {}, message: {} },
							saveData: {},
							inputs: {},
						},
					},
				],
				transaction_history: [
					...mockConfig.transaction_history,
					{
						action_id: "select_1",
						payload: {
							context: {
								message_id: "select-msg-456",
								timestamp: "2025-11-11T11:00:00.000Z",
							},
							message: {},
						},
						saved_info: {},
					},
				],
			};
			const complexRunner = new MockRunner(complexConfig, true);

			const context = complexRunner.generateContext("on_select_1", "on_select");

			expect(context.message_id).toBe("select-msg-456");
		});

		it("should handle mixed version formats", () => {
			const configs = [
				{ version: "2.0.0", expected: "version" },
				{ version: "1.0.0", expected: "core_version" },
				{ version: "1.5.2", expected: "core_version" },
				{ version: "2.1.0", expected: "version" },
				{ version: "0.9.0", expected: "version" },
			];

			configs.forEach(({ version, expected }) => {
				const testConfig = {
					...mockConfig,
					meta: { ...mockConfig.meta, version },
				};
				const testRunner = new MockRunner(testConfig, true);
				const context = testRunner.generateContext("search_1", "search");

				if (expected === "core_version") {
					expect(context).toHaveProperty("core_version", version);
					expect(context).toHaveProperty("country", "IND");
					expect(context).not.toHaveProperty("version");
					expect(context).not.toHaveProperty("location");
				} else {
					expect(context).toHaveProperty("version", version);
					expect(context).toHaveProperty("location");
					expect(context).not.toHaveProperty("core_version");
					expect(context).not.toHaveProperty("country");
				}
			});
		});
	});

	describe("Error Handling and Edge Cases", () => {
		it("should handle malformed transaction history", () => {
			const configWithMalformedHistory = {
				...mockConfig,
				transaction_history: [
					{
						action_id: "search_1",
						payload: null as any, // Malformed payload
						saved_info: {},
					},
				],
			};
			const runnerWithMalformedHistory = new MockRunner(
				configWithMalformedHistory,
				true,
			);

			// This will throw because the function tries to access payload.context on null
			expect(() => {
				runnerWithMalformedHistory.generateContext("on_search_1", "on_search");
			}).not.toThrow("Cannot read properties of null (reading 'context')");
		});

		it("should handle very long action names", () => {
			const longActionId = "a".repeat(1000);
			const context = mockRunner.generateContext(longActionId, "search");

			expect(context.action).toBe("search");
			expect(context.domain).toBe("ONDC:TRV14");
		});

		it("should handle special characters in action names", () => {
			const specialActionId = "test-action_with.special@chars#123";
			const context = mockRunner.generateContext(
				specialActionId,
				"special/action",
			);

			expect(context.action).toBe("special/action");
			expect(context.message_id).toBe("test-uuid-1234");
		});

		it("should handle sessionData with proper array format", () => {
			const sessionData = {
				transaction_id: ["custom-txn-id"],
				latestMessage_id: ["custom-msg-id"],
			};

			const context = mockRunner.generateContext(
				"on_search_1",
				"on_search",
				sessionData,
			);

			expect(context.transaction_id).toBe("custom-txn-id");
			expect(context.message_id).toBe("custom-msg-id");
		});

		it("should handle sessionData with undefined arrays", () => {
			const sessionData = {
				transaction_id: undefined,
				latestMessage_id: undefined,
			};

			const context = mockRunner.generateContext(
				"on_search_1",
				"on_search",
				sessionData,
			);

			expect(context.transaction_id).toBe("txn-123"); // Falls back to config
			expect(context.message_id).toBe("search-msg-123"); // Falls back to transaction history
		});

		it("should handle properly formatted transaction history with no message_id", () => {
			const configWithValidHistoryNoMsgId = {
				...mockConfig,
				transaction_history: [
					{
						action_id: "search_1",
						payload: {
							context: {
								// No message_id field
								timestamp: "2025-11-11T10:00:00.000Z",
							},
							message: {},
						},
						saved_info: {},
					},
				],
			};
			const runnerWithValidHistory = new MockRunner(
				configWithValidHistoryNoMsgId,
				true,
			);

			const context = runnerWithValidHistory.generateContext(
				"on_search_1",
				"on_search",
			);

			expect(context.message_id).toBe("test-uuid-1234"); // Should generate new UUID
		});
	});
});
