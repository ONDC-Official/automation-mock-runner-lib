import { z } from "zod";
import {
	BaseMetaSchema,
	BasePlaygroundConfigSchema,
} from "../types/base-config";

/**
 * Meta for a v2 (Protocol Studio) config: the shared base meta plus the v2 flag. No
 * flowId / flowName — one v2 config holds many flows.
 *
 * @experimental The v2 config shape will change before the flow graph lands.
 */
export const MetaV2Schema = BaseMetaSchema.extend({
	playground_version: z.literal("v2"),
	/**
	 * The session-data schema that types `sessionData` (`SessionDataSchemaV2.id`).
	 * Absent: chosen from `use_case_id`, or inferred from the published flows.
	 */
	session_schema_id: z.string().optional(),
});

/**
 * Top-level v2 config, the format Protocol Studio edits.
 *
 * @experimental The multi-flow graph (flows / nodes / edges) is not defined yet.
 */
export const MockPlaygroundConfigV2Schema = BasePlaygroundConfigSchema.extend({
	meta: MetaV2Schema,
	/**
	 * The helpers' TypeScript source, base64, when they are written in TypeScript.
	 * `helperLib` always holds the compiled JavaScript, which is what runs; this
	 * is only what the editor shows. Absent: the helpers are plain JavaScript.
	 */
	helperLibTs: z.string().optional(),
});

export type MetaV2 = z.infer<typeof MetaV2Schema>;
export type MockPlaygroundConfigV2Type = z.infer<
	typeof MockPlaygroundConfigV2Schema
>;
