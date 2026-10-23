import * as acorn from "acorn";

/** @experimental */
export interface HelperDeclarationsV2 {
	/** Global declarations for the helpers, for an editor's extra libs. */
	dts: string;
	/** The top-level function names: what `helperLib` adds to `generate`'s scope. */
	names: string[];
	/** Why the helpers couldn't be read, if they couldn't (the dts is then empty). */
	error?: string;
}

/**
 * Declarations for a JavaScript `helperLib`, so typed step code can call its
 * functions: each top-level `function` becomes `declare function name(...): any`
 * (`Promise<any>` when async), carrying its JSDoc for hovers, and each
 * top-level `const` / `let` / `var` becomes `declare const name: any`.
 *
 * At runtime the helpers are prepended to `generate` only; `validate` and
 * `meetsRequirements` can't call them.
 *
 * @experimental
 */
export const extractHelperDeclarationsV2 = (
	js: string,
): HelperDeclarationsV2 => {
	const comments: acorn.Comment[] = [];
	let ast: acorn.Program;
	try {
		ast = acorn.parse(js, {
			ecmaVersion: 2020,
			sourceType: "script",
			onComment: comments,
		});
	} catch (e) {
		return {
			dts: "",
			names: [],
			error: e instanceof Error ? e.message : String(e),
		};
	}

	// The JSDoc block right before a declaration (only whitespace between).
	const docFor = (start: number) => {
		const doc = comments
			.filter(
				(c) => c.type === "Block" && c.value.startsWith("*") && c.end <= start,
			)
			.pop();
		return doc && /^\s*$/.test(js.slice(doc.end, start))
			? `/*${doc.value}*/\n`
			: "";
	};

	const names: string[] = [];
	const lines: string[] = [
		"// Declarations for helpers.js: available inside generate only.",
	];
	for (const node of ast.body as any[]) {
		if (node.type === "FunctionDeclaration" && node.id) {
			const params = node.params
				.map((param: any, i: number) => {
					if (param.type === "RestElement")
						return `...${param.argument?.name ?? `rest${i}`}: any[]`;
					const name =
						param.type === "Identifier"
							? param.name
							: param.type === "AssignmentPattern" &&
								  param.left.type === "Identifier"
								? param.left.name
								: `arg${i}`;
					// A default value makes it optional; JS callers often omit trailing args anyway.
					return `${name}?: any`;
				})
				.join(", ");
			names.push(node.id.name);
			lines.push(
				`${docFor(node.start)}declare function ${node.id.name}(${params}): ${
					node.async ? "Promise<any>" : "any"
				};`,
			);
		}
		if (node.type === "VariableDeclaration") {
			for (const declarator of node.declarations) {
				if (declarator.id?.type !== "Identifier") continue;
				names.push(declarator.id.name);
				lines.push(
					`${docFor(node.start)}declare const ${declarator.id.name}: any;`,
				);
			}
		}
	}
	return { dts: lines.join("\n") + "\n", names };
};
