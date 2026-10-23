import type { SessionDataSchemaV2 } from "./schema";

/**
 * The session data V2 step code sees: a shallow copy of the stored session in
 * which every `cardinality: one` key is unwrapped to its first match
 * (`city_code: ["std:080"]` → `"std:080"`, `[]` → `undefined`). Keys that are
 * `many`, undeclared, builtin, or already not a list pass through unchanged.
 *
 * Storage never changes: the runner still saves each JSONPath result as a list,
 * so v1 configs, the mock service's stored session and code that reads
 * `sessionData.city_code[0]` are unaffected. Only V2 nodes that opt in to the
 * typed view are given this.
 *
 * @experimental
 */
export const buildSessionViewV2 = (
	stored: Record<string, unknown>,
	schema?: SessionDataSchemaV2 | null,
): Record<string, unknown> => {
	const view: Record<string, unknown> = { ...stored };
	if (!schema) return view;
	for (const [name, key] of Object.entries(schema.keys)) {
		if (key.cardinality !== "one" || key.builtin) continue;
		const value = stored[name];
		if (Array.isArray(value)) view[name] = value[0];
	}
	return view;
};
