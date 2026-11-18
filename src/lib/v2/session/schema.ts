import { z } from "zod";

/**
 * Where a session key's value comes from: one `saveData` entry of one step.
 *
 * @experimental
 */
export const SessionKeySourceV2Schema = z.looseObject({
	/** The flow the step was found in (informational). */
	flow: z.string().optional(),
	/** The step's action id. */
	action: z.string().optional(),
	/** The step's API: the payload `path` runs against. */
	api: z.string().optional(),
	/** A JSONPath into the payload, or `EVAL#<base64>` for a getSave extractor. */
	path: z.string(),
	/** `EVAL#`: the value is what `getSave` returns, not a JSONPath match list. */
	eval: z.boolean().optional(),
	/** Saved as `APPEND#key`: each step's matches are appended. */
	append: z.boolean().optional(),
});

/**
 * One session key.
 *
 * - `cardinality`: `one` unwraps the stored match list to its first match in
 *   the V2 *view* (`buildSessionViewV2`); `many` (or absent) keeps the list.
 *   What is stored never changes: every JSONPath result is an array.
 * - `schema`: a JSON Schema for one match, overriding what `sources` infer.
 *   `$ref`s resolve against the spec (`#/components/schemas/…`).
 *
 * @experimental
 */
export const SessionKeyV2Schema = z.looseObject({
	description: z.string().optional(),
	cardinality: z.enum(["one", "many"]).optional(),
	status: z.enum(["inferred", "curated", "unresolved"]).optional(),
	/** Filled by the runner itself (`user_inputs`, `formData`, form submission ids). */
	builtin: z.boolean().optional(),
	/** The type of a builtin that isn't a match list, e.g. `{ type: "string" }`. */
	schema: z.any().optional(),
	sources: z.array(SessionKeySourceV2Schema).optional(),
});

/**
 * The session data of one domain / version / use case: which keys exist, where
 * each comes from and what type it has. `id` is what configs and actions point
 * at (`meta.session_schema_id`, `session_schema_ref_id`).
 *
 * @experimental
 */
export const SessionDataSchemaV2Schema = z.looseObject({
	id: z.string().min(1, "Session schema id is required"),
	meta: z.looseObject({
		type: z.literal("session_schema"),
		schema_version: z.number().int().optional(),
		config_version: z.string().optional(),
		domain: z.string().optional(),
		version: z.string().optional(),
		/** An `info.x-usecases` entry, e.g. "Ride-hailing". */
		usecase: z.string().optional(),
		description: z.string().optional(),
		/** Closed: only the declared keys exist (no `[key: string]: any` in the type). */
		closed: z.boolean().optional(),
		/** Set when a tool wrote the schema. */
		generated: z.looseObject({}).optional(),
	}),
	keys: z.record(z.string(), SessionKeyV2Schema),
});

export type SessionKeySourceV2 = z.infer<typeof SessionKeySourceV2Schema>;
export type SessionKeyV2 = z.infer<typeof SessionKeyV2Schema>;
export type SessionDataSchemaV2 = z.infer<typeof SessionDataSchemaV2Schema>;

/** A stable session schema id: `trv10-2.1.0-ride-hailing`. */
export const getSessionSchemaIdV2 = (
	domain: string,
	version: string,
	usecase?: string,
) =>
	[domain.replace(/^ondc:/i, ""), version, usecase ?? "all"]
		.join("-")
		.toLowerCase()
		.replace(/[^a-z0-9.]+/g, "-")
		.replace(/^-+|-+$/g, "");
