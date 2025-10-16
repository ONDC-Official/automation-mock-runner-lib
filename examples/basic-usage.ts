/**
 * Comprehensive example demonstrating ONDC Mock Runner usage
 * This example shows a complete search-to-confirm transaction flow
 *
 * IMPORTANT: All mock functions (generate, validate, requirements) must be:
 * 1. Complete functions with proper function declarations
 * 2. Base64 encoded for security
 * 3. Include the full function body with return statements
 */

import { MockRunner } from "../src/lib/MockRunner";
import { MockPlaygroundConfigType } from "../src/lib/types/mock-config";

async function runONDCExample() {
	console.log("🚀 Starting ONDC Mock Runner Example");

	// Helper function to create base64 encoded functions
	function encodeFunction(functionCode: string): string {
		return MockRunner.encodeBase64(functionCode);
	}

	// Complete ONDC transaction configuration
	const config: MockPlaygroundConfigType = {
		meta: {
			domain: "ONDC:RET11",
			version: "1.2.0",
			flowId: "retail-search-to-confirm-flow",
		},
		transaction_data: {
			transaction_id: "550e8400-e29b-41d4-a716-446655440000",
			latest_timestamp: new Date().toISOString(),
			bap_id: "buyer-app.ondc.example.com",
			bap_uri: "https://buyer-app.ondc.example.com",
			bpp_id: "seller-app.ondc.example.com",
			bpp_uri: "https://seller-app.ondc.example.com",
		},
		steps: [
			{
				api: "search",
				action_id: "search_electronics",
				owner: "BAP",
				responseFor: null,
				unsolicited: false,
				description: "Search for electronics products in Bangalore",
				mock: {
					generate: encodeFunction(`
            async function generate(defaultPayload, sessionData) {
              // Add search intent to payload
              defaultPayload.message = {
                intent: {
                  category: {
                    descriptor: { name: "Electronics" }
                  },
                  location: {
                    country: { code: "IND" },
                    city: { code: "std:080" }
                  },
                  fulfillment: {
                    type: "Delivery"
                  }
                }
              };
              
              console.log("Generated search payload for electronics");
              return defaultPayload;
            }
          `),
					validate: encodeFunction(`
            function validate(targetPayload, sessionData) {
              // Validate search response has catalog with providers
              if (!targetPayload.message?.catalog?.providers?.length) {
                return { 
                  valid: false, 
                  code: 400, 
                  description: "No providers found in catalog" 
                };
              }
              
              const providers = targetPayload.message.catalog.providers;
              console.log(\`Found \${providers.length} providers\`);
              
              return { 
                valid: true, 
                code: 200, 
                description: \`Valid catalog with \${providers.length} providers\` 
              };
            }
          `),
					requirements: encodeFunction(`
            function meetsRequirements(sessionData) {
              // Always ready to search
              return { 
                valid: true, 
                code: 200, 
                description: "Ready to perform search" 
              };
            }
          `),
					defaultPayload: {
						context: {},
						message: {},
					},
					saveData: {
						searchResults: "$.message.catalog.providers",
						catalogId: "$.message.catalog.descriptor.name",
					},
					inputs: {
						id: "search_inputs",
						jsonSchema: {
							type: "object",
							properties: {
								category: { type: "string", default: "Electronics" },
								location: { type: "string", default: "Bangalore" },
							},
						},
					},
				},
			},
			{
				api: "select",
				action_id: "select_item",
				owner: "BAP",
				responseFor: null,
				unsolicited: false,
				description: "Select specific items from search results",
				mock: {
					generate: encodeFunction(`
            async function generate(defaultPayload, sessionData) {
              // Use saved search results to select items
              const providers = sessionData.searchResults;
              if (!providers || providers.length === 0) {
                throw new Error("No search results available for selection");
              }
              
              const selectedProvider = providers[0];
              const selectedItem = selectedProvider.items?.[0];
              
              if (!selectedItem) {
                throw new Error("No items available in selected provider");
              }
              
              defaultPayload.message = {
                order: {
                  provider: {
                    id: selectedProvider.id,
                    locations: selectedProvider.locations
                  },
                  items: [{
                    id: selectedItem.id,
                    quantity: {
                      count: sessionData.user_inputs?.quantity || 1
                    }
                  }],
                  billing: {
                    name: sessionData.user_inputs?.customerName || "John Doe",
                    email: sessionData.user_inputs?.email || "john@example.com"
                  }
                }
              };
              
              console.log(\`Selected item: \${selectedItem.descriptor?.name}\`);
              return defaultPayload;
            }
          `),
					validate: encodeFunction(`
            function validate(targetPayload, sessionData) {
              // Validate select response has quotation
              if (!targetPayload.message?.order?.quote) {
                return { 
                  valid: false, 
                  code: 400, 
                  description: "No quotation provided" 
                };
              }
              
              const quote = targetPayload.message.order.quote;
              if (!quote.price || !quote.breakup) {
                return { 
                  valid: false, 
                  code: 400, 
                  description: "Incomplete quotation details" 
                };
              }
              
              return { 
                valid: true, 
                code: 200, 
                description: \`Valid quotation with total: ₹\${quote.price.value}\` 
              };
            }
          `),
					requirements: encodeFunction(`
            function meetsRequirements(sessionData) {
              // Check if search was completed
              if (!sessionData.searchResults) {
                return { 
                  valid: false, 
                  code: 428, 
                  description: "Search must be completed before selection" 
                };
              }
              
              return { 
                valid: true, 
                code: 200, 
                description: "Ready to select items" 
              };
            }
          `),
					defaultPayload: {
						context: {},
						message: {},
					},
					saveData: {
						selectedOrder: "$.message.order",
						quotedPrice: "$.message.order.quote.price.value",
						selectedItems: "$.message.order.items",
					},
					inputs: {
						id: "select_inputs",
						jsonSchema: {
							type: "object",
							properties: {
								quantity: { type: "integer", minimum: 1, default: 1 },
								customerName: { type: "string", minLength: 2 },
								email: { type: "string", format: "email" },
							},
							required: ["customerName", "email"],
						},
					},
				},
			},
		],
		transaction_history: [],
		validationLib: encodeFunction(`
      // Shared validation utilities
      function validatePrice(price) {
        return price && typeof price.value === 'number' && price.value > 0;
      }
      
      function validateContact(contact) {
        return contact && contact.email && contact.phone;
      }
    `),
		helperLib: encodeFunction(`
      // Shared helper functions  
      function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR'
        }).format(amount);
      }
      
      function generateOrderId() {
        return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      }
    `),
	};

	try {
		// Initialize MockRunner
		console.log("📋 Initializing MockRunner with configuration...");
		const runner = new MockRunner(config);

		// Validate configuration
		console.log("✅ Validating configuration...");
		const configValidation = runner.validateConfig();
		if (!configValidation.success) {
			console.error(
				"❌ Configuration validation failed:",
				configValidation.errors,
			);
			return;
		}
		console.log("✅ Configuration is valid!");

		// Example 1: Generate search payload
		console.log("\n🔍 Generating search payload...");
		const searchInputs = {
			category: "Electronics",
			location: "Bangalore",
		};

		const searchResult = await runner.runGeneratePayload(
			"search_electronics",
			searchInputs,
		);
		if (searchResult.success) {
			console.log("✅ Search payload generated successfully!");
			console.log("📄 Payload:", JSON.stringify(searchResult.result, null, 2));
		} else {
			console.error("❌ Search payload generation failed:", searchResult.error);
			return;
		}

		// Example 2: Simulate search response and validate
		console.log("\n🔍 Simulating search response validation...");
		const mockSearchResponse = {
			context: searchResult.result?.context,
			message: {
				catalog: {
					descriptor: { name: "Electronics Catalog" },
					providers: [
						{
							id: "provider-001",
							descriptor: { name: "TechStore" },
							locations: [{ id: "loc-001", city: { code: "std:080" } }],
							items: [
								{
									id: "item-001",
									descriptor: { name: "Smartphone" },
									price: { value: 25000, currency: "INR" },
								},
							],
						},
					],
				},
			},
		};

		const searchValidation = await runner.runValidatePayload(
			"search_electronics",
			mockSearchResponse,
		);
		if (searchValidation.success) {
			console.log("✅ Search response validation passed!");
			console.log("📋 Validation result:", searchValidation.result);
		} else {
			console.error(
				"❌ Search response validation failed:",
				searchValidation.error,
			);
		}

		// Example 3: Add to transaction history and proceed to select
		console.log("\n🛒 Adding search to transaction history...");
		config.transaction_history.push({
			action_id: "search_electronics",
			payload: mockSearchResponse,
			saved_info: {},
		});

		// Update runner with new history
		const updatedRunner = new MockRunner(config);

		// Check requirements for select step
		console.log("\n🔍 Checking requirements for select step...");
		const selectRequirements =
			await updatedRunner.runMeetRequirements("select_item");
		if (selectRequirements.success && selectRequirements.result?.valid) {
			console.log("✅ Requirements met for selection!");
			console.log("📋 Requirement check:", selectRequirements.result);
		} else {
			console.error("❌ Requirements not met:", selectRequirements.result);
			return;
		}

		// Example 4: Generate select payload
		console.log("\n🛒 Generating select payload...");
		const selectInputs = {
			quantity: 2,
			customerName: "Alice Johnson",
			email: "alice@example.com",
		};

		const selectResult = await updatedRunner.runGeneratePayload(
			"select_item",
			selectInputs,
		);
		if (selectResult.success) {
			console.log("✅ Select payload generated successfully!");
			console.log("📄 Payload:", JSON.stringify(selectResult.result, null, 2));
		} else {
			console.error("❌ Select payload generation failed:", selectResult.error);
		}

		console.log("\n🎉 ONDC Mock Runner example completed successfully!");
	} catch (error) {
		console.error("💥 Example execution failed:", error);
	}
}

// Run the example
if (require.main === module) {
	runONDCExample().catch(console.error);
}

export { runONDCExample };
