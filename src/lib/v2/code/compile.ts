import * as acorn from "acorn";
import * as walk from "acorn-walk";

import { getFunctionSchema } from "../../constants/function-registry";
import { encode } from "../../utils/base64";
import { CodeValidator } from "../../validators/code-validator";
import { fnv1a } from "../typegen/spec";
import { createLineMapperV2 } from "./source-map";

/** What a V2 node or config holds as code: a step function, or the shared helpers. @experimental */
export type UserCodeKindV2 =
	| "generate"
	| "validate"
	| "meetsRequirements"
	| "match"
	| "exit"
	| "helpers";

/** @experimental */
export interface TranspileOutputV2 {
	js: string;
	/** A v3 source map, to report errors at the source's lines. */
	sourceMap?: string;
	/** Syntax errors the transpiler found; any fails the compile. */
	diagnostics?: Array<{ message: string; line?: number }>;
}

/**
 * Turns TypeScript into JavaScript. Passed in rather than bundled: the browser
 * uses its editor's TypeScript worker, Node passes the `typescript` package
 * (`createTypeScriptTranspilerV2`), and the lib depends on neither.
 *
 * @experimental
 */
export interface UserCodeTranspilerV2 {
	name: string;
	version: string;
	transpile(
		source: string,
		fileName: string,
	): Promise<TranspileOutputV2> | TranspileOutputV2;
}

/** @experimental */
export interface CodeIssueV2 {
	message: string;
	/** 1-based line in the TypeScript source, when known. */
	line?: number;
}

/** @experimental */
export interface CompiledUserCodeV2 {
	/** True when the JavaScript can run: no syntax or sandbox errors. */
	ok: boolean;
	js?: string;
	/** `js`, base64: what `generate` / `validate` / `requirements` / `helperLib` store. */
	jsBase64?: string;
	/** The TypeScript source, base64. */
	sourceBase64: string;
	/** FNV-1a of `js`: tells whether stored JS still matches its TS source. */
	jsHash?: string;
	/** `<name>@<version>` of the transpiler that produced `js`. */
	compiler: string;
	errors: CodeIssueV2[];
	warnings: CodeIssueV2[];
}

/**
 * Compiler options for step code, as plain values (map them to your compiler's
 * enums). The output must be what the sandbox runs: an ES2020 *script*, with
 * its top-level `function generate` (etc.) intact, so:
 *
 * - `module: ESNext` keeps any `import` / `export` as written, so the compile
 *   can reject it with a clear message (CommonJS would emit `exports.…`).
 * - `alwaysStrict: false`: no `"use strict"` prologue, which would put
 *   `validate` (it gets no helper prefix) in strict mode.
 * - No `isolatedModules`: step files are global scripts, which it rejects
 *   (TS1208) in an editor's language service.
 *
 * @experimental
 */
export const USER_CODE_TS_COMPILER_OPTIONS_V2 = {
	target: "ES2020",
	module: "ESNext",
	alwaysStrict: false,
	sourceMap: true,
	removeComments: false,
} as const;

/** The parts of the `typescript` package `createTypeScriptTranspilerV2` uses. */
export interface TypeScriptModuleLikeV2 {
	version: string;
	ScriptTarget: Record<string, any>;
	ModuleKind: Record<string, any>;
	transpileModule(
		input: string,
		options: {
			compilerOptions?: any;
			fileName?: string;
			reportDiagnostics?: boolean;
		},
	): {
		outputText: string;
		sourceMapText?: string;
		diagnostics?: Array<{
			messageText: unknown;
			start?: number;
			file?: { getLineAndCharacterOfPosition(pos: number): { line: number } };
		}>;
	};
	flattenDiagnosticMessageText(messageText: unknown, newLine: string): string;
}

/**
 * A transpiler backed by the `typescript` package, for Node (tests, build
 * tools): `createTypeScriptTranspilerV2(require("typescript"))`.
 *
 * @experimental
 */
export const createTypeScriptTranspilerV2 = (
	ts: TypeScriptModuleLikeV2,
): UserCodeTranspilerV2 => ({
	name: "typescript",
	version: ts.version,
	transpile(source, fileName) {
		const result = ts.transpileModule(source, {
			fileName,
			reportDiagnostics: true,
			compilerOptions: {
				...USER_CODE_TS_COMPILER_OPTIONS_V2,
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.ESNext,
			},
		});
		return {
			js: result.outputText,
			sourceMap: result.sourceMapText,
			diagnostics: (result.diagnostics ?? []).map((d) => ({
				message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
				line:
					d.file && d.start !== undefined
						? d.file.getLineAndCharacterOfPosition(d.start).line + 1
						: undefined,
			})),
		};
	},
});

/**
 * What a transpiler adds that must not ship: a leading `"use strict"` directive
 * (its line is kept, so the source map stays valid) and the trailing
 * `//# sourceMappingURL=` comment (the map is used here, not shipped).
 */
const stripEmitArtifacts = (js: string) =>
	js
		.replace(/^(\s*)(["'])use strict\2;?/, "$1")
		.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, "\n");

/** Calls to helpers in a function that runs without them (only `generate` gets `helperLib`). */
const findHelperCalls = (ast: acorn.Node, helperNames: string[]) => {
	const declared = new Set(
		((ast as any).body as any[])
			.filter((node) => node.type === "FunctionDeclaration" && node.id)
			.map((node) => node.id.name),
	);
	const calls: Array<{ name: string; line: number }> = [];
	walk.simple(ast, {
		CallExpression(node: any) {
			const name =
				node.callee?.type === "Identifier" ? node.callee.name : undefined;
			if (name && helperNames.includes(name) && !declared.has(name)) {
				calls.push({ name, line: node.loc?.start.line ?? 0 });
			}
		},
	});
	return calls;
};

/**
 * Compiles TypeScript step code (or helpers) to the JavaScript the runners
 * execute, and checks it exactly as v1 code is checked:
 *
 * 1. transpile (syntax errors fail);
 * 2. parse as an ES2020 script, rejecting `import` / `export`;
 * 3. `CodeValidator.validate` with the function's schema: sandbox rules, the
 *    top-level `function <kind>` and, for validate / meetsRequirements, the
 *    return shape;
 * 4. warn when `validate` / `meetsRequirements` call a helper (`helperNames`),
 *    which only `generate` has at runtime.
 *
 * Type errors are not checked: they are the editor's job, and a compile
 * without a type checker (Node, CI) must give the same result as one with.
 * Lines in messages are mapped back to the TypeScript source.
 *
 * @experimental
 */
export const compileUserCodeV2 = async (
	source: string,
	kind: UserCodeKindV2,
	options: {
		transpiler: UserCodeTranspilerV2;
		helperNames?: string[];
		fileName?: string;
	},
): Promise<CompiledUserCodeV2> => {
	const { transpiler, helperNames = [] } = options;
	const fileName = options.fileName ?? `${kind}.ts`;
	const base = {
		sourceBase64: encode(source),
		compiler: `${transpiler.name}@${transpiler.version}`,
	};
	const fail = (
		errors: CodeIssueV2[],
		warnings: CodeIssueV2[] = [],
	): CompiledUserCodeV2 => ({
		...base,
		ok: false,
		errors,
		warnings,
	});

	let output: TranspileOutputV2;
	try {
		output = await transpiler.transpile(source, fileName);
	} catch (e) {
		return fail([
			{
				message: `Could not compile: ${e instanceof Error ? e.message : String(e)}`,
			},
		]);
	}
	if (output.diagnostics && output.diagnostics.length > 0) {
		return fail(
			output.diagnostics.map((d) => ({ message: d.message, line: d.line })),
		);
	}

	const js = stripEmitArtifacts(output.js);
	const toSource = createLineMapperV2(output.sourceMap);
	const at = (line?: number) => (line ? (toSource(line) ?? line) : undefined);

	let ast: acorn.Node;
	try {
		ast = acorn.parse(js, {
			ecmaVersion: 2020,
			sourceType: "script",
			locations: true,
		});
	} catch (e: any) {
		const generatedLine: number | undefined = e?.loc?.line;
		const isModule = /'import' and 'export' may appear only/.test(
			String(e?.message),
		);
		return fail([
			{
				message: isModule
					? "import / export aren't supported: step code runs as a plain script, and helpers are already global"
					: `Syntax error: ${String(e?.message).replace(/\s*\(\d+:\d+\)$/, "")}`,
				line: at(generatedLine),
			},
		]);
	}

	const schema = getFunctionSchema(kind === "helpers" ? "getSave" : kind);
	const validation = CodeValidator.validate(js, schema);
	// `[Line N] …` from the validator is a line of the JavaScript.
	const mapIssue = (message: string): CodeIssueV2 => {
		const match = message.match(/^\[Line (\d+)\]\s*/);
		return match
			? { message: message.slice(match[0].length), line: at(Number(match[1])) }
			: { message };
	};
	const errors = validation.errors.map(mapIssue);
	// Helpers borrow getSave's schema for the sandbox rules only: its
	// best-practice warnings ("should return a value") don't apply to a library.
	const warnings = kind === "helpers" ? [] : validation.warnings.map(mapIssue);

	if (
		kind === "validate" ||
		kind === "meetsRequirements" ||
		kind === "match" ||
		kind === "exit"
	) {
		for (const call of findHelperCalls(ast, helperNames)) {
			warnings.push({
				message: `${call.name}() is a helper: helpers are only available inside generate, so this call fails at runtime`,
				line: at(call.line),
			});
		}
	}

	if (errors.length > 0) return fail(errors, warnings);
	return {
		...base,
		ok: true,
		js,
		jsBase64: encode(js),
		jsHash: fnv1a(js),
		errors,
		warnings,
	};
};
