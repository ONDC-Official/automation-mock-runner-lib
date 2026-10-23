import { z } from "zod";

// Version-agnostic config pieces. v1 (`./mock-config`) and v2 (`../v2/types`)
// both extend these; this file must not know about either.

export const BaseMetaSchema = z.object({
	domain: z.string().min(1, "Domain is required"),
	version: z.string().min(1, "Version is required"),
	config_version: z.string().optional(),
	description: z.string().optional(),
	use_case_id: z.string().optional(),
});

export const TransactionDataSchema = z.object({
	transaction_id: z.string().min(1, "Transaction ID is required"),
	latest_timestamp: z.string().min(1, "Latest timestamp is required"),
	bap_id: z.string().optional(),
	bap_uri: z.string().min(1, "BAP URI is required").optional(),
	bpp_id: z.string().min(1, "BPP ID is required").optional(),
	bpp_uri: z.string().min(1, "BPP URI is required").optional(),
	external_session_data: z.record(z.string(), z.any()).optional(),
});

export const BasePlaygroundConfigSchema = z.object({
	meta: BaseMetaSchema,
	transaction_data: TransactionDataSchema,
	helperLib: z.string(),
	validationLib: z.string(),
});

export type BaseMeta = z.infer<typeof BaseMetaSchema>;
export type TransactionData = z.infer<typeof TransactionDataSchema>;
export type BasePlaygroundConfig = z.infer<typeof BasePlaygroundConfigSchema>;
