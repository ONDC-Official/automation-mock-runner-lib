/**
 * The slice of a built spec (`build.yaml`, or the config service's
 * `/protocol/spec/:domain/:version?include=meta` → `meta`) that type generation reads.
 * Everything else in the spec is ignored, so a whole `meta` object can be passed.
 *
 * @experimental
 */
export interface SpecDocumentV2 {
	paths?: Record<string, any>;
	components?: Record<string, any>;
	domain?: string;
	version?: string;
	info?: { domain?: string; version?: string; [key: string]: unknown };
}

/** A JSON Schema, as found in the spec. */
export type JsonSchemaV2 = Record<string, any> | boolean;

/** JSON Pointer token escaping (RFC 6901). */
export const escapePointerToken = (token: string) =>
	token.replace(/~/g, "~0").replace(/\//g, "~1");

export const unescapePointerToken = (token: string) =>
	token.replace(/~1/g, "/").replace(/~0/g, "~");

/** The pointer to an API's request body schema, e.g. `#/paths/~1search/post/requestBody/…`. */
export const getRequestSchemaPointer = (api: string) =>
	`#/paths/${escapePointerToken(`/${api}`)}/post/requestBody/content/${escapePointerToken(
		"application/json",
	)}/schema`;

/** Every API's request body schema, keyed by API name (the path without its `/`), sorted. */
export const getRequestSchemas = (
	spec: SpecDocumentV2,
): Array<{ api: string; schema: JsonSchemaV2 }> =>
	Object.keys(spec.paths ?? {})
		.sort()
		.flatMap((path) => {
			const schema =
				spec.paths?.[path]?.post?.requestBody?.content?.["application/json"]
					?.schema;
			return schema && path.startsWith("/")
				? [{ api: path.slice(1), schema }]
				: [];
		});

/** Resolves a local `#/…` pointer against the spec; undefined when it doesn't resolve. */
export const resolvePointer = (
	spec: SpecDocumentV2,
	pointer: string,
): unknown => {
	if (!pointer.startsWith("#")) return undefined;
	let node: unknown = spec;
	for (const raw of pointer.slice(1).split("/").slice(1)) {
		if (node === null || typeof node !== "object") return undefined;
		node = (node as Record<string, unknown>)[unescapePointerToken(raw)];
	}
	return node;
};

/** The schema at `pointer`, following `$ref`s; undefined on a dangling or circular ref. */
export const derefPointer = (
	spec: SpecDocumentV2,
	pointer: string,
): unknown => {
	const seen = new Set<string>();
	let node = resolvePointer(spec, pointer);
	while (
		node &&
		typeof node === "object" &&
		typeof (node as any).$ref === "string"
	) {
		const ref: string = (node as any).$ref;
		if (seen.has(ref)) return undefined;
		seen.add(ref);
		node = resolvePointer(spec, ref);
	}
	return node;
};

/** FNV-1a (32-bit) of a string, as 8 hex digits: a cheap, stable fingerprint. */
export const fnv1a = (text: string) => {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
};

/** The spec's domain and version, wherever the spec shape keeps them. */
export const getSpecLabel = (spec: SpecDocumentV2) => ({
	domain: spec.domain ?? spec.info?.domain,
	version: spec.version ?? spec.info?.version,
});
