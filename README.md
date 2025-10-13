# ONDC Automation Mock Runner

A robust TypeScript library designed for testing and validating ONDC (Open Network for Digital Commerce) transaction flows. This tool helps developers build reliable ONDC integrations by providing a comprehensive framework for generating, validating, and testing API payloads across different transaction scenarios.

## What is this?

When building applications that integrate with the ONDC network, you need to handle complex multi-step transaction flows where each API call depends on data from previous steps. This library provides a structured way to:

- **Generate realistic test payloads** for ONDC APIs (search, select, init, confirm, etc.)
- **Validate incoming requests** against your business logic
- **Check prerequisites** before proceeding with each transaction step
- **Maintain session state** across the entire transaction flow

The core concept is simple: define your transaction flow once, then let the runner handle payload generation, validation, and state management automatically.

## Key Features

### 🔄 Transaction Flow Management

- Define multi-step ONDC transaction flows with dependencies between steps
- Automatic context generation with proper ONDC headers and metadata
- Session data persistence across transaction steps

### 🧪 Secure Code Execution

- Safe execution of custom JavaScript functions for payload generation and validation
- Multiple execution environments: Node.js worker threads, VM sandboxes, or browser workers
- Built-in timeout protection and error isolation

### ✅ Schema Validation

- Zod-based configuration validation
- Runtime type checking for all inputs and outputs
- Detailed error reporting with line-by-line feedback

### 🎯 ONDC-Specific Features

- Built-in support for BAP (Buyer App) and BPP (Seller App) roles
- Automatic message ID correlation for request-response pairs
- Version-aware context generation (supports ONDC v1.x and v2.x)

## Installation

```bash
npm install @ondc/automation-mock-runner
```

## Quick Start

Here's how to set up a basic ONDC search-to-confirm flow:

```typescript
import { MockRunner } from "@ondc/automation-mock-runner";

// Define your transaction configuration
const config = {
	meta: {
		domain: "retail",
		version: "1.2.0",
		flowId: "search-select-init-confirm",
	},
	transaction_data: {
		transaction_id: "uuid-here",
		latest_timestamp: new Date().toISOString(),
		bap_id: "buyer-app.example.com",
		bap_uri: "https://buyer-app.example.com",
		bpp_id: "seller-app.example.com",
		bpp_uri: "https://seller-app.example.com",
	},
	steps: [
		{
			api: "search",
			action_id: "search_001",
			owner: "BAP",
			responseFor: null,
			unsolicited: false,
			description: "Search for products in electronics category",
			mock: {
				generate: `
          // Add search intent to the payload
          defaultPayload.message = {
            intent: {
              category: { descriptor: { name: "Electronics" } },
              location: { country: { code: "IND" }, city: { code: "std:080" } }
            }
          };
          return defaultPayload;
        `,
				validate: `
          if (!targetPayload.message?.catalog?.providers?.length) {
            return { valid: false, code: 400, description: "No providers found" };
          }
          return { valid: true, code: 200, description: "Valid catalog response" };
        `,
				requirements: `return { valid: true, code: 200, description: "Ready to search" };`,
				defaultPayload: { context: {}, message: {} },
				saveData: {
					providers: "$.message.catalog.providers",
				},
				inputs: {},
			},
		},
	],
	transaction_history: [],
	validationLib: "",
	helperLib: "",
};

// Initialize the runner
const runner = new MockRunner(config);

// Generate a search payload
const searchResult = await runner.runGeneratePayload("search_001", {});
console.log("Generated search payload:", searchResult.result);

// Validate a response
const validationResult = await runner.runValidatePayload(
	"search_001",
	responsePayload
);
console.log("Validation passed:", validationResult.success);
```

## Configuration Structure

### Transaction Metadata

```typescript
meta: {
  domain: string,     // ONDC domain (retail, mobility, etc.)
  version: string,    // ONDC version (1.2.0, 2.0.0, etc.)
  flowId: string      // Unique identifier for this flow
}
```

### Transaction Data

```typescript
transaction_data: {
  transaction_id: string,      // UUID for this transaction
  latest_timestamp: string,    // ISO timestamp
  bap_id?: string,            // Buyer app ID
  bap_uri?: string,           // Buyer app URI
  bpp_id?: string,            // Seller app ID
  bpp_uri?: string            // Seller app URI
}
```

### Action Steps

Each step represents one API call in your transaction flow:

```typescript
{
  api: "search" | "select" | "init" | "confirm" | "on_search" | "on_select" | ...,
  action_id: string,          // Unique ID for this step
  owner: "BAP" | "BPP",      // Who initiates this call
  responseFor: string | null, // If this responds to another action
  unsolicited: boolean,       // Whether this is an unsolicited call
  description: string,        // Human-readable description
  mock: {
    generate: string,         // JavaScript code to generate payload
    validate: string,         // JavaScript code to validate response
    requirements: string,     // JavaScript code to check prerequisites
    defaultPayload: object,   // Base payload structure
    saveData: object,         // JSONPath expressions to save data
    inputs: object           // Input schema for user data
  }
}
```

## Advanced Usage

### Chaining Transaction Steps

```typescript
const steps = [
	{
		api: "search",
		action_id: "search_001",
		// ... search configuration
		mock: {
			saveData: {
				selectedProvider: "$.message.catalog.providers[0]",
			},
			// ...
		},
	},
	{
		api: "select",
		action_id: "select_001",
		// ... select configuration
		mock: {
			generate: `
        // Use data from previous search step
        const provider = sessionData.selectedProvider;
        defaultPayload.message = {
          order: {
            provider: { id: provider.id },
            items: [{ id: provider.items[0].id, quantity: { count: 1 } }]
          }
        };
        return defaultPayload;
      `,
			// ...
		},
	},
];
```

### Custom Validation Logic

```typescript
const validatePayload = `
  // Check if order total matches expected amount
  const expectedTotal = sessionData.calculatedTotal;
  const actualTotal = targetPayload.message.order.quote.total;
  
  if (Math.abs(expectedTotal - actualTotal) > 0.01) {
    return {
      valid: false,
      code: 400, 
      description: \`Total mismatch: expected \${expectedTotal}, got \${actualTotal}\`
    };
  }
  
  return { valid: true, code: 200, description: "Order total validated" };
`;
```

### User Input Handling

```typescript
const stepWithInputs = {
	// ... other config
	mock: {
		generate: `
      // Access user inputs
      const { email, deliveryAddress } = sessionData.user_inputs;
      
      defaultPayload.message.order.billing = {
        email: email,
        address: deliveryAddress
      };
      
      return defaultPayload;
    `,
		inputs: {
			id: "user_details",
			jsonSchema: {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
					deliveryAddress: { type: "string", minLength: 10 },
				},
				required: ["email", "deliveryAddress"],
			},
		},
	},
};
```

## API Reference

### MockRunner

#### Constructor

```typescript
new MockRunner(config: MockPlaygroundConfigType)
```

#### Methods

**`validateConfig()`**
Validates the entire configuration against the schema.

```typescript
const validation = runner.validateConfig();
if (!validation.success) {
	console.log("Config errors:", validation.errors);
}
```

**`runGeneratePayload(actionId: string, inputs: any)`**
Generates a payload for the specified action step.

```typescript
const result = await runner.runGeneratePayload("search_001", {
	category: "books",
});
```

**`runValidatePayload(actionId: string, targetPayload: any)`**
Validates an incoming payload against the specified action step.

```typescript
const result = await runner.runValidatePayload(
	"on_search_001",
	responsePayload
);
```

**`runMeetRequirements(actionId: string, targetPayload: any)`**
Checks if prerequisites are met before proceeding with an action.

```typescript
const result = await runner.runMeetRequirements("select_001", {});
```

**`getDefaultStep(api: string, actionId: string)`**
Creates a new step configuration with sensible defaults.

```typescript
const newStep = runner.getDefaultStep("search", "search_002");
```

## Error Handling

The library provides detailed error information for debugging:

```typescript
const result = await runner.runGeneratePayload("invalid_step", {});

if (!result.success) {
	console.log("Error:", result.error.message);
	console.log("Logs:", result.logs);
	console.log("Execution time:", result.executionTime);
}
```

Common error types:

- **ValidationError**: Configuration or input validation failed
- **PayloadGenerationError**: Error in payload generation code
- **PayloadValidationError**: Error in validation code
- **MeetRequirementsError**: Error in requirements check code
- **TimeoutError**: Code execution exceeded timeout limit

## Testing

The library includes comprehensive tests. Run them with:

```bash
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Security Considerations

- All user code runs in isolated environments (worker threads or VM sandboxes)
- Dangerous functions like `eval`, `require`, and file system access are blocked
- Execution timeouts prevent infinite loops
- Memory limits prevent resource exhaustion

## Contributing

This library is built for the ONDC ecosystem. When contributing:

1. Ensure all tests pass: `npm test`
2. Follow the existing code style: `npm run lint`
3. Add tests for new features
4. Update documentation for API changes

## License

ISC License - see LICENSE file for details.

## Support

For ONDC-specific questions, refer to the [ONDC documentation](https://ondc.org/). For issues with this library, please file an issue on the repository.
