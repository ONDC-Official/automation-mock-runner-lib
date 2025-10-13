import { z } from "zod";

// Zod schemas
export const OwnerSchema = z.enum(["BAP", "BPP"]);

export const MetaSchema = z.object({
	domain: z.string().min(1, "Domain is required"),
	version: z.string().min(1, "Version is required"),
	flowId: z.string().min(1, "Flow ID is required"),
});

export const TransactionDataSchema = z.object({
	transaction_id: z.string().min(1, "Transaction ID is required"),
	latest_timestamp: z.string().min(1, "Latest timestamp is required"),
	bap_id: z.string().optional(),
	bap_uri: z.string().min(1, "BAP URI is required").optional(),
	bpp_id: z.string().min(1, "BPP ID is required").optional(),
	bpp_uri: z.string().min(1, "BPP URI is required").optional(),
});

export const MockConfigSchema = z.object({
	generate: z.string(),
	validate: z.string(),
	requirements: z.string(),
	defaultPayload: z.any(),
	saveData: z.record(z.string(), z.string()),
	inputs: z.object({
		id: z.string().min(1, "Input ID is required").optional(),
		jsonSchema: z.any().optional(),
	}),
});

export const PlaygroundActionStepSchema = z.object({
	api: z.string().min(1, "API is required"),
	action_id: z.string().min(1, "Action ID is required"),
	owner: OwnerSchema,
	responseFor: z.string().nullable(),
	unsolicited: z.boolean(),
	description: z.string(),
	mock: MockConfigSchema,
});

export const TransactionHistoryItemSchema = z.object({
	action_id: z.string().min(1, "Action ID is required"),
	payload: z.any(),
	saved_info: z.record(z.string(), z.any()),
});

export const MockPlaygroundConfigSchema = z.object({
	meta: MetaSchema,
	transaction_data: TransactionDataSchema,
	steps: z.array(PlaygroundActionStepSchema),
	transaction_history: z.array(TransactionHistoryItemSchema),
	validationLib: z.string(),
	helperLib: z.string(),
});

// Inferred types from Zod schemas
export type Owner = z.infer<typeof OwnerSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type TransactionData = z.infer<typeof TransactionDataSchema>;
export type MockConfig = z.infer<typeof MockConfigSchema>;
export type PlaygroundActionStep = z.infer<typeof PlaygroundActionStepSchema>;
export type TransactionHistoryItem = z.infer<
	typeof TransactionHistoryItemSchema
>;
export type MockPlaygroundConfigType = z.infer<
	typeof MockPlaygroundConfigSchema
>;
