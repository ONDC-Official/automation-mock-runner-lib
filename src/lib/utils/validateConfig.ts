import {
	MockPlaygroundConfigType,
	MockPlaygroundConfigSchema,
} from "../types/mock-config";
import { z } from "zod";
import { ValidationError } from "./errors";

export function validateConfigWithErrors(config: MockPlaygroundConfigType): {
	success: boolean;
	errors?: z.core.$ZodIssue[];
} {
	const result = MockPlaygroundConfigSchema.safeParse(config);
	if (result.success) {
		return { success: true };
	} else {
		return {
			success: false,
			errors: result.error.issues,
		};
	}
}

export function validateGoodConfig(config: MockPlaygroundConfigType): void {
	// 1. Validate base schema
	const baseResult = validateConfigWithErrors(config);
	if (!baseResult.success && baseResult.errors) {
		const messages = baseResult.errors.map(
			(e) => `[${e.path.join(".") || "root"}] ${e.message}`,
		);
		throw new ValidationError(
			`Config schema validation failed with ${messages.length} error(s)`,
			messages,
			{ flowId: config?.meta?.flowId },
		);
	}

	const errors: string[] = [];

	// 2. If inputs.id is present, both sampleData and jsonSchema must also be present
	config.steps.forEach((step, index) => {
		const { id, sampleData, jsonSchema } = step.mock.inputs;
		if (id !== undefined) {
			if (sampleData === undefined || sampleData === null) {
				errors.push(
					`steps[${index}] (action_id: "${step.action_id}"): inputs.sampleData is required when inputs.id is set`,
				);
			}
			if (jsonSchema === undefined || jsonSchema === null) {
				errors.push(
					`steps[${index}] (action_id: "${step.action_id}"): inputs.jsonSchema is required when inputs.id is set`,
				);
			}
		}
	});

	// 3. Length of steps must equal length of transaction_history
	// if (config.steps.length !== config.transaction_history.length) {
	// 	errors.push(
	// 		`steps length (${config.steps.length}) must equal transaction_history length (${config.transaction_history.length})`,
	// 	);
	// }

	if (errors.length > 0) {
		throw new ValidationError(
			`Config validation failed with ${errors.length} error(s)`,
			errors,
			{ flowId: config.meta.flowId },
		);
	}
}
