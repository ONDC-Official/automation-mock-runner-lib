import { z } from "zod";
import {
	BaseMetaSchema,
	BasePlaygroundConfigSchema,
	TransactionDataSchema,
} from "./base-config";

// v1 config: one config per flow. Built on the shared base; v1 carries no
// playground_version flag (its absence is what marks a config as v1).

export { TransactionDataSchema };
export type { TransactionData } from "./base-config";

// Zod schemas
export const OwnerSchema = z.enum(["BAP", "BPP"]);

export const MetaSchema = BaseMetaSchema.extend({
	flowId: z.string().min(1, "Flow ID is required"),
	flowName: z.string().optional(),
});

export const MockConfigSchema = z.object({
	generate: z.base64(),
	validate: z.base64(),
	requirements: z.base64(),
	defaultPayload: z.any(),
	saveData: z.record(z.string(), z.string()),
	inputs: z.object({
		id: z.string().min(1, "Input ID is required").optional(),
		jsonSchema: z.any().optional(),
		sampleData: z.any().optional(),
		oldInputs: z.any().optional(),
	}),
	formHtml: z.base64().optional(),
});

export const PlaygroundActionStepSchema = z.object({
	api: z.string().min(1, "API is required"),
	action_id: z.string().min(1, "Action ID is required"),
	owner: OwnerSchema,
	responseFor: z.string().nullable(),
	unsolicited: z.boolean(),
	description: z.string(),
	repeatCount: z
		.number()
		.min(1, "Repeat count must be at least 1")
		.optional()
		.nullable(),
	mock: MockConfigSchema,
	examples: z
		.array(
			z.object({
				name: z.string().min(1, "Example name is required"),
				description: z.string().optional(),
				payload: z.any(),
				type: z.enum(["request", "response"]),
			}),
		)
		.optional(),
});

export const TransactionHistoryItemSchema = z.object({
	action_id: z.string().min(1, "Action ID is required"),
	action: z.string().optional(),
	payload: z.any(),
	saved_info: z.record(z.string(), z.any()),
});

export const MockPlaygroundConfigSchema = BasePlaygroundConfigSchema.extend({
	meta: MetaSchema,
	steps: z.array(PlaygroundActionStepSchema),
	extra_steps: z
		.object({
			steps: z.array(PlaygroundActionStepSchema),
		})
		.optional(),
	transaction_history: z.array(TransactionHistoryItemSchema),
});

// Inferred types from Zod schemas
export type Owner = z.infer<typeof OwnerSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type MockConfig = z.infer<typeof MockConfigSchema>;
export type PlaygroundActionStep = z.infer<typeof PlaygroundActionStepSchema>;
export type TransactionHistoryItem = z.infer<
	typeof TransactionHistoryItemSchema
>;
export type MockPlaygroundConfigType = z.infer<
	typeof MockPlaygroundConfigSchema
>;
