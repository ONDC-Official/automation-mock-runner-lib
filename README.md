# @ondc/automation-mock-runner

A robust TypeScript library designed for testing and validating ONDC (Open Network for Digital Commerce) transaction flows. This tool helps developers build reliable ONDC integrations by providing a comprehensive framework for generating, validating, and testing API payloads across different transaction scenarios.

## What is this?

When building applications that integrate with the ONDC network, you need to handle complex multi-step transaction flows where each API call depends on data from previous steps. This library provides a structured way to:

- **Generate realistic test payloads** for ONDC APIs (search, select, init, confirm, etc.)
- **Validate incoming requests** against your business logic with custom validation functions
- **Check prerequisites** before proceeding with each transaction step
- **Maintain session state** across the entire transaction flow
- **Execute code securely** using sandboxed Worker Threads with base64-encoded functions

The core concept is simple: define your transaction flow with base64-encoded functions, then let the runner handle payload generation, validation, and state management automatically in a secure environment.

## Key Features

### 🔄 Transaction Flow Management

- Define multi-step ONDC transaction flows with dependencies between steps
- Automatic context generation with proper ONDC headers and metadata
- Session data persistence across transaction steps

### 🔒 Secure Code Execution

- **Base64-encoded functions** for secure storage and transmission
- **Sandboxed Worker Threads** with isolated VM contexts
- **Complete function declarations** required (not just function bodies)
- Built-in timeout protection and error isolation
- Memory limits and resource monitoring

### ✅ Schema Validation

- Zod-based configuration validation with base64 string validation
- Runtime type checking for all inputs and outputs
- Detailed error reporting with line-by-line feedback
- JSON Schema validation for user inputs

### 🎯 ONDC-Specific Features

- Built-in support for BAP (Buyer App) and BPP (Seller App) roles
- Automatic message ID correlation for request-response pairs
- Version-aware context generation (supports ONDC v1.x and v2.x)
- Domain-specific helper utilities

## Installation

```bash
npm install @ondc/automation-mock-runner
```

## Quick Start

Here's how to set up a basic ONDC search flow with base64-encoded functions:

```typescript
import { MockRunner } from "@ondc/automation-mock-runner";
import { MockPlaygroundConfigType } from "@ondc/automation-mock-runner";

// Helper function to encode functions as base64
function encodeFunction(functionCode: string): string {
	return MockRunner.encodeBase64(functionCode);
}

// Define your transaction configuration
const config: MockPlaygroundConfigType = {
	meta: {
		domain: "ONDC:RET11",
		version: "1.2.0",
		flowId: "search-select-init-confirm",
	},
	transaction_data: {
		transaction_id: "550e8400-e29b-41d4-a716-446655440000",
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
				generate: encodeFunction(`
          async function generate(defaultPayload, sessionData) {
            // Add search intent to the payload
            defaultPayload.message = {
              intent: {
                category: { descriptor: { name: "Electronics" } },
                location: { country: { code: "IND" }, city: { code: "std:080" } }
              }
            };
            return defaultPayload;
          }
        `),
				validate: encodeFunction(`
          function validate(targetPayload, sessionData) {
            if (!targetPayload.message?.catalog?.providers?.length) {
              return { valid: false, code: 400, description: "No providers found" };
            }
            return { valid: true, code: 200, description: "Valid catalog response" };
          }
        `),
				requirements: encodeFunction(`
          function meetsRequirements(sessionData) {
            return { valid: true, code: 200, description: "Ready to search" };
          }
        `),
				defaultPayload: { context: {}, message: {} },
				saveData: {
					providers: "$.message.catalog.providers",
				},
				inputs: {
					id: "search_inputs",
					jsonSchema: {
						type: "object",
						properties: {
							category: { type: "string", default: "Electronics" },
						},
					},
				},
			},
		},
	],
	transaction_history: [],
	validationLib: encodeFunction(`
    // Shared validation utilities
    function validateONDCContext(context) {
      return context && context.domain && context.action && context.message_id;
    }
  `),
	helperLib: encodeFunction(`
    // Shared helper functions
    function generateMessageId() {
      return crypto.randomUUID();
    }
  `),
};

// Initialize the runner
const runner = new MockRunner(config);

// Generate a search payload
const searchResult = await runner.runGeneratePayload("search_001", {
	category: "Electronics",
});
console.log("Generated search payload:", searchResult.result);

// Validate a response
const validationResult = await runner.runValidatePayload(
	"search_001",
	responsePayload,
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
    generate: string,         // Base64-encoded complete function for payload generation
    validate: string,         // Base64-encoded complete function for response validation
    requirements: string,     // Base64-encoded complete function for prerequisite checks
    defaultPayload: object,   // Base payload structure
    saveData: object,         // JSONPath expressions to save data
    inputs: object           // Input schema for user data
  }
}
```

## 🔑 Base64 Function Requirements

**IMPORTANT**: All mock functions must be:

1. **Complete function declarations** with proper function names:
   - `generate` functions: `async function generate(defaultPayload, sessionData) { ... }`
   - `validate` functions: `function validate(targetPayload, sessionData) { ... }`
   - `requirements` functions: `function meetsRequirements(sessionData) { ... }`

2. **Base64 encoded** using `MockRunner.encodeBase64()` utility

3. **Properly formatted** with return statements and error handling

### Function Signatures

Each function type has a specific signature that must be followed:

#### Generate Functions

```typescript
async function generate(defaultPayload: any, sessionData: any): Promise<any> {
	// Parameters:
	// - defaultPayload: Base payload with context already populated
	// - sessionData: Contains user_inputs and data from previous steps

	// Must return the complete payload to be sent
	return defaultPayload;
}
```

#### Validate Functions

```typescript
function validate(targetPayload: any, sessionData: any): ValidationResult {
	// Parameters:
	// - targetPayload: The incoming payload to validate
	// - sessionData: Data from previous steps

	// Must return validation result object
	return {
		valid: true,
		code: 200,
		description: "Validation passed",
	};
}
```

#### Requirements Functions

```typescript
function meetsRequirements(sessionData: any): RequirementResult {
	// Parameters:
	// - sessionData: Data from previous steps

	// Must return requirement check result
	return {
		valid: true,
		code: 200,
		description: "Requirements met",
	};
}
```

### Example Function Creation:

```typescript
// Create a complete function
const generateFunction = `
  async function generate(defaultPayload, sessionData) {
    // Your logic here
    defaultPayload.message = { 
      intent: { category: { descriptor: { name: "Electronics" } } }
    };
    return defaultPayload;
  }
`;

// Encode it as base64
const encodedFunction = MockRunner.encodeBase64(generateFunction);

// Use in configuration
const step = {
	// ...other properties...
	mock: {
		generate: encodedFunction,
		// ...other mock properties...
	},
};
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
// Create complete validation function
const validateFunction = `
  function validate(targetPayload, sessionData) {
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
  }
`;

// Encode for use in configuration
const encodedValidateFunction = MockRunner.encodeBase64(validateFunction);
```

### User Input Handling

```typescript
// Create function that uses user inputs
const generateWithInputs = `
  async function generate(defaultPayload, sessionData) {
    // Access user inputs
    const { email, deliveryAddress } = sessionData.user_inputs;
    
    defaultPayload.message.order.billing = {
      email: email,
      address: deliveryAddress
    };
    
    return defaultPayload;
  }
`;

const stepWithInputs = {
	// ... other config
	mock: {
		generate: MockRunner.encodeBase64(generateWithInputs),
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
	responsePayload,
);
```

**`runMeetRequirements(actionId: string, targetPayload: any)`**
Checks if prerequisites are met before proceeding with an action.

```typescript
const result = await runner.runMeetRequirements("select_001", {});
```

**`getDefaultStep(api: string, actionId: string)`**
Creates a new step configuration with sensible defaults and base64-encoded template functions.

```typescript
const newStep = runner.getDefaultStep("search", "search_002");
// Returns a step with properly encoded template functions
```

**`MockRunner.encodeBase64(functionString: string)`**
Static utility to encode functions as base64.

```typescript
const encodedFunction = MockRunner.encodeBase64(`
  async function generate(defaultPayload, sessionData) {
    // Your function logic here
    return defaultPayload;
  }
`);
```

**`MockRunner.decodeBase64(encodedString: string)`**
Static utility to decode base64-encoded functions (used internally).

```typescript
const decodedFunction = MockRunner.decodeBase64(encodedFunction);
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

- **Base64 encoding** prevents code injection through configuration
- **Complete function declarations** required - no arbitrary code execution
- **Sandboxed Worker Threads** with isolated VM contexts
- **Restricted global access** - dangerous functions like `eval`, `require`, and file system access are blocked
- **Execution timeouts** prevent infinite loops and hanging processes
- **Memory limits** prevent resource exhaustion
- **Input validation** using Zod schemas for all configuration data

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
