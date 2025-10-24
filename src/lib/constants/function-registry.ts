// lib/code-runner/function-registry.ts

export type FunctionNamesType = "generate" | "validate" | "meetsRequirements";
export interface FunctionParameter {
	name: string;
	type: string;
	description?: string;
	required?: boolean;
}

export interface ReturnTypeSchema {
	type: string;
	properties?: Record<string, { type: string; description: string }>;
	description: string;
}

export interface FunctionSchema {
	name: FunctionNamesType;
	parameters: FunctionParameter[];
	returnType: ReturnTypeSchema;
	description: string;
	timeout?: number;
	defaultBody: string; // Changed from defaultCode
	template: (body: string) => string; // Function wrapper template
}

export const FUNCTION_REGISTRY: Record<string, FunctionSchema> = {
	generate: {
		name: "generate",
		parameters: [
			{
				name: "defaultPayload",
				type: "Object",
				description: "The base payload object with context already populated",
				required: true,
			},
			{
				name: "sessionData",
				type: "Object",
				description: "Data collected from previous transaction steps",
				required: true,
			},
		],
		returnType: {
			type: "Object",
			description: "The generated payload object to be sent in the API request",
		},
		description: "Generates the mock payload for an API call",
		timeout: 60 * 1000,
		defaultBody: `  return defaultPayload;`,
		template: (body: string) => `/**
 * Generates the mock payload for an API call in the transaction flow.
 * This function allows customization of the default payload using session data
 * from previous steps and user inputs.
 * 
 * @param {Object} defaultPayload - The base payload object with context already populated.
 * @param {Object} sessionData - Data collected from previous transaction steps.
 * @param {Object} sessionData.user_inputs - User-provided input values for this step.
 * @param {*} sessionData.[key] - Any saved data from previous steps (defined in saveData config).
 * 
 * @returns {Object} The generated payload object to be sent in the API request.
 */
async function generate(defaultPayload, sessionData) {
${body}
}`,
	},

	validate: {
		name: "validate",
		parameters: [
			{
				name: "targetPayload",
				type: "Object",
				description: "The incoming request payload to validate",
				required: true,
			},
			{
				name: "sessionData",
				type: "Object",
				description: "Data collected from previous transaction steps",
				required: true,
			},
		],
		returnType: {
			type: "Object",
			properties: {
				valid: { type: "boolean", description: "Whether the payload is valid" },
				code: { type: "number", description: "Error code" },
				description: {
					type: "string",
					description: "Validation result message",
				},
			},
			description: "Validation result object",
		},
		description: "Validates the incoming request payload",
		timeout: 5000,
		defaultBody: `  return { valid: true, code: 200, description: "Valid request" };`,
		template: (body: string) => `/**
 * Validates the incoming request payload for an API call in the transaction flow.
 * 
 * @param {Object} targetPayload - The incoming request payload to validate.
 * @param {Object} sessionData - Data collected from previous transaction steps.
 * 
 * @returns {Object} { valid: boolean, code: number, description: string }
 */
function validate(targetPayload, sessionData) {
${body}
}`,
	},

	meetsRequirements: {
		name: "meetsRequirements",
		parameters: [
			{
				name: "sessionData",
				type: "Object",
				description: "Data collected from previous transaction steps",
				required: true,
			},
		],
		returnType: {
			type: "Object",
			properties: {
				valid: { type: "boolean", description: "Whether requirements are met" },
				code: { type: "number", description: "Status code" },
				description: {
					type: "string",
					description: "Requirement check result",
				},
			},
			description: "Requirement check result object",
		},
		description: "Checks if requirements for the API call are met",
		timeout: 3000,
		defaultBody: `  return { valid: true, code: 200, description: "Requirements met" };`,
		template: (body: string) => `/**
 * Checks if the requirements for proceeding with the API call are met.
 * 
 * @param {Object} sessionData - Data collected from previous transaction steps.
 * 
 * @returns {Object} { valid: boolean, code: number, description: string }
 */
function meetsRequirements(sessionData) {
${body}
}`,
	},
};

export function getFunctionSchema(property: FunctionNamesType): FunctionSchema {
	const item = FUNCTION_REGISTRY[property];
	if (!item) {
		throw new Error(`Function schema for ${property} not found`);
	}
	return item;
}
