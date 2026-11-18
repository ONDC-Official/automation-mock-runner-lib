import jsonpath from "jsonpath";

import {
	escapePointerToken,
	getRequestSchemaPointer,
	resolvePointer,
	type SpecDocumentV2,
} from "./spec";

/** @experimental */
export interface JsonPathSchemaV2 {
	/**
	 * Pointers (into the spec) to the schemas a match can have, e.g.
	 * `#/components/schemas/Order/properties/id`. Several when the path runs
	 * through a union; empty when it couldn't be followed.
	 */
	pointers: string[];
	/** Whether the path can match more than one node: `[*]`, filters, slices, unions, `..`. */
	multi: boolean;
	/** Why the path couldn't be followed, if it couldn't. */
	problem?: string;
}

/** How deep a `..name` search goes before giving up. */
const DESCENDANT_DEPTH = 12;
/** Most matches a `..name` search collects. */
const DESCENDANT_LIMIT = 20;

type Component = {
	expression: { type: string; value: any };
	operation?: "member" | "subscript";
	scope?: "child" | "descendant";
};

const asSchema = (node: unknown): Record<string, any> | undefined =>
	node !== null && typeof node === "object" && !Array.isArray(node)
		? (node as Record<string, any>)
		: undefined;

/**
 * Which schema a `saveData` JSONPath lands on, in an API's request body:
 * `resolveJsonPathSchemaV2(spec, "search", "$.context.location.city.code")`
 * gives the pointer to `code`'s schema. Follows `$ref`s and every branch of
 * `allOf` / `anyOf` / `oneOf`.
 *
 * Supports what `saveData` uses: `.name`, `['name']`, `[0]`, `[*]` / `.*`,
 * filters `[?(…)]`, slices, scripts `[(…)]`, unions `[0,1]` / `['a','b']`,
 * and `..name` (bounded).
 *
 * @experimental
 */
export const resolveJsonPathSchemaV2 = (
	spec: SpecDocumentV2,
	api: string,
	path: string,
): JsonPathSchemaV2 => {
	const root = getRequestSchemaPointer(api);
	if (!asSchema(resolvePointer(spec, root))) {
		return {
			pointers: [],
			multi: false,
			problem: `no request schema for "${api}"`,
		};
	}

	let components: Component[];
	try {
		components = jsonpath.parse(path) as Component[];
	} catch (e) {
		return {
			pointers: [],
			multi: false,
			problem: `not a JSONPath: ${e instanceof Error ? e.message : String(e)}`,
		};
	}

	/** Follows a `$ref` chain to the schema itself; undefined on a dangling or circular ref. */
	const deref = (
		pointer: string,
		seen = new Set<string>(),
	): string | undefined => {
		const node = asSchema(resolvePointer(spec, pointer));
		if (!node) return undefined;
		if (typeof node.$ref !== "string") return pointer;
		if (!node.$ref.startsWith("#") || seen.has(node.$ref)) return undefined;
		seen.add(node.$ref);
		return deref(node.$ref, seen);
	};

	/** A schema and every `allOf` / `anyOf` / `oneOf` branch inside it, dereferenced. */
	const branches = (pointer: string, depth = 0): string[] => {
		const resolved = deref(pointer);
		const node = resolved
			? asSchema(resolvePointer(spec, resolved))
			: undefined;
		if (!resolved || !node || depth > 16) return [];
		const out = [resolved];
		for (const key of ["allOf", "anyOf", "oneOf"]) {
			if (Array.isArray(node[key])) {
				node[key].forEach((_: unknown, i: number) =>
					out.push(...branches(`${resolved}/${key}/${i}`, depth + 1)),
				);
			}
		}
		return out;
	};

	const schemaAt = (pointer: string) =>
		asSchema(resolvePointer(spec, pointer)) ?? {};

	const member = (pointer: string, name: string) =>
		branches(pointer).flatMap((branch) => {
			const node = schemaAt(branch);
			if (asSchema(node.properties)?.[name] !== undefined) {
				return [`${branch}/properties/${escapePointerToken(name)}`];
			}
			return asSchema(node.additionalProperties)
				? [`${branch}/additionalProperties`]
				: [];
		});

	const elements = (pointer: string) =>
		branches(pointer).flatMap((branch) => {
			const node = schemaAt(branch);
			if (Array.isArray(node.prefixItems)) {
				return node.prefixItems.map(
					(_: unknown, i: number) => `${branch}/prefixItems/${i}`,
				);
			}
			if (Array.isArray(node.items)) {
				return node.items.map(
					(_: unknown, i: number) => `${branch}/items/${i}`,
				);
			}
			return asSchema(node.items) ? [`${branch}/items`] : [];
		});

	const children = (pointer: string) =>
		branches(pointer).flatMap((branch) => {
			const props = asSchema(schemaAt(branch).properties) ?? {};
			return Object.keys(props).map(
				(name) => `${branch}/properties/${escapePointerToken(name)}`,
			);
		});

	/** Every schema under `pointer` (itself excluded) that a `..name` / `..*` can reach. */
	const descendants = (pointer: string, name: string | null) => {
		const found: string[] = [];
		const seen = new Set<string>();
		let frontier = [pointer];
		for (
			let depth = 0;
			depth < DESCENDANT_DEPTH && frontier.length > 0;
			depth++
		) {
			const next: string[] = [];
			for (const at of frontier) {
				for (const child of [...children(at), ...elements(at)]) {
					const key = deref(child) ?? child;
					if (seen.has(key)) continue;
					seen.add(key);
					const childName = child.split("/").pop();
					if (name === null || childName === escapePointerToken(name))
						found.push(child);
					next.push(child);
				}
			}
			if (found.length >= DESCENDANT_LIMIT) break;
			frontier = next;
		}
		return found.slice(0, DESCENDANT_LIMIT);
	};

	let current = [root];
	let multi = false;
	for (const component of components.slice(1)) {
		const { type, value } = component.expression;
		const descendant = component.scope === "descendant";
		const step = (pointer: string): string[] => {
			if (descendant) {
				multi = true;
				return descendants(pointer, type === "wildcard" ? null : String(value));
			}
			switch (type) {
				case "identifier":
				case "string_literal":
					return member(pointer, String(value));
				case "numeric_literal":
					return elements(pointer);
				case "script_expression":
					// `[(@.length-1)]`: one element, picked by a script.
					return elements(pointer);
				case "filter_expression":
				case "slice":
					multi = true;
					return elements(pointer);
				case "wildcard":
					multi = true;
					return [...elements(pointer), ...children(pointer)];
				case "union":
					multi = true;
					return (value as Component[]).flatMap((part) =>
						part.expression.type === "numeric_literal"
							? elements(pointer)
							: member(pointer, String(part.expression.value)),
					);
				default:
					return [];
			}
		};
		const next = [...new Set(current.flatMap(step))];
		if (next.length === 0) {
			const label =
				typeof value === "string" || typeof value === "number" ? value : type;
			return {
				pointers: [],
				multi,
				problem: `"${descendant ? ".." : ""}${label}" isn't in the ${api} request schema`,
			};
		}
		current = next;
	}

	return { pointers: current, multi };
};
