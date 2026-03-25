import {
	MockPlaygroundConfigSchema,
	MockPlaygroundConfigType,
} from "../types/mock-config";
import z from "zod";
import { ValidationError } from "./errors";
import Ajv from "ajv";

export function validateConfigWithErrors(config: MockPlaygroundConfigType): {
	success: boolean;
	errors?: z.core.$ZodIssue[];
} {
	const result = MockPlaygroundConfigSchema.safeParse(config);
	if (result.success) {
		return { success: true };
	} else {
		return { success: false, errors: result.error.issues };
	}
}

export function validateGoodConfig(config: MockPlaygroundConfigType): void {
	// 1. Validate base schema
	const baseResult = validateConfigWithErrors(config);
	if (!baseResult.success && baseResult.errors) {
		const messages = baseResult.errors.map(
			(e) => `  • [${e.path.join(".") || "root"}]: ${e.message}`,
		);
		throw new ValidationError(
			`Schema validation failed — ${messages.length} issue(s):\n\n${messages.join("\n")}\n`,
			messages,
			{ flowId: config?.meta?.flowId },
		);
	}

	const errors: string[] = [];

	// 2. inputs validation
	const ajv = new Ajv();
	config.steps.forEach((step, index) => {
		const { id, sampleData, jsonSchema } = step.mock.inputs;
		const label = `steps[${index}] (action_id: "${step.action_id}")`;

		if (
			step.mock.inputs !== undefined &&
			Object.keys(step.mock.inputs).length > 0
		) {
			if (id === undefined || id === null) {
				errors.push(
					`  • ${label}: inputs.id is required when inputs is defined`,
				);
			}
		}

		if (id !== undefined) {
			if (sampleData === undefined || sampleData === null) {
				errors.push(
					`  • ${label}: inputs.sampleData is required when inputs.id is set`,
				);
			}
			if (jsonSchema === undefined || jsonSchema === null) {
				errors.push(
					`  • ${label}: inputs.jsonSchema is required when inputs.id is set`,
				);
			}
		}

		if (sampleData != null && jsonSchema != null) {
			const validate = ajv.compile(jsonSchema);
			if (!validate(sampleData) && validate.errors) {
				validate.errors.forEach((e) => {
					errors.push(
						`  • ${label}: inputs.sampleData${e.instancePath} ${e.message}`,
					);
				});
			}
		}
	});

	if (errors.length > 0) {
		throw new ValidationError(
			`Config validation failed — ${errors.length} error(s):\n\n${errors.join("\n")}\n`,
			errors,
			{ flowId: config.meta.flowId },
		);
	}
}
