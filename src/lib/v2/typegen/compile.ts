import type { JsonSchemaV2 } from "./spec";

/**
 * Options for `json-schema-to-typescript-lite` (the browser-safe fork of
 * json-schema-to-typescript: no prettier, lodash or glob).
 *
 * - `additionalProperties: false`: an object only gets an index signature when
 *   its schema asks for one. The ONDC specs leave it unset almost everywhere,
 *   and a signature on every object would make every typo type-check.
 * - `ignoreMinAndMaxItems`: `minItems: 1, maxItems: 20` must stay `T[]`, not a
 *   20-way tuple union.
 * - `unknownAny: false`: an untyped leaf is `any`, so loosely specified
 *   payloads (most specs are inferred from examples) stay usable.
 * - `$refOptions`: only local `#/…` refs. A spec never makes the generator
 *   read a file or fetch a URL.
 */
const CONVERTER_OPTIONS = {
	additionalProperties: false,
	ignoreMinAndMaxItems: true,
	unknownAny: false,
	strictIndexSignatures: false,
	declareExternallyReferenced: true,
	unreachableDefinitions: false,
	$refOptions: { resolve: { file: false, http: false } },
};

/**
 * Rewrites OpenAPI-only keywords the converter doesn't know into plain JSON
 * Schema, on a copy: OpenAPI 3.0 `nullable: true` becomes a `null` member of
 * `type`. (3.1 type arrays like `["integer", "string"]` are JSON Schema already.)
 */
export const normalizeOpenApiSchema = <T>(schema: T): T => {
	if (Array.isArray(schema)) return schema.map(normalizeOpenApiSchema) as T;
	if (schema === null || typeof schema !== "object") return schema;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(schema)) {
		if (key !== "nullable") out[key] = normalizeOpenApiSchema(value);
	}
	if ((schema as Record<string, unknown>).nullable === true) {
		const type = out.type;
		if (typeof type === "string") out.type = [type, "null"];
		else if (Array.isArray(type) && !type.includes("null"))
			out.type = [...type, "null"];
		else if (type === undefined) return { anyOf: [out, { type: "null" }] } as T;
	}
	return out as T;
};

/**
 * Converts `root` (a JSON Schema, which may carry `components` / `paths` for its
 * `$ref`s to resolve against) to TypeScript declarations. The root type is named
 * `name`; every named sub-schema becomes its own `export` declaration.
 */
export const schemaToTypeScript = async (
	root: JsonSchemaV2,
	name: string,
): Promise<string> => {
	// The converter may annotate the schema it walks; never touch the caller's.
	const copy = normalizeOpenApiSchema(JSON.parse(JSON.stringify(root)));
	// Loaded on first use, not with the lib: its ref parser needs Node 20, and
	// Node services that load the lib for v1 never generate types.
	// Bundlers' CommonJS interop may hand the module over as `default`.
	const loaded: any = await import("json-schema-to-typescript-lite");
	const compile: typeof import("json-schema-to-typescript-lite").compile =
		loaded.compile ?? loaded.default?.compile;
	if (typeof compile !== "function") {
		throw new Error("json-schema-to-typescript-lite didn't load");
	}
	const ts = await compile(copy, name, CONVERTER_OPTIONS as any);
	return ts.trim();
};

/** Indents declarations into `declare namespace <name> { … }`: script-mode, so they're global. */
export const wrapInNamespace = (name: string, declarations: string) =>
	[
		`declare namespace ${name} {`,
		...declarations.split("\n").map((line) => (line ? `    ${line}` : line)),
		"}",
	].join("\n");
