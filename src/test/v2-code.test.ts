import ts from "typescript";

import { MockRunner } from "../lib/MockRunner";
import { createInitialMockConfig } from "../lib/configHelper";
import {
	buildSessionViewV2,
	compileUserCodeV2,
	createTypeScriptTranspilerV2,
	extractHelperDeclarationsV2,
	getFunctionTemplateV2,
	type SessionDataSchemaV2,
} from "../lib/v2";

const transpiler = createTypeScriptTranspilerV2(ts);

describe("compileUserCodeV2", () => {
	it("compiles a typed generate to plain ES2020 script JS", async () => {
		const source = `interface Extra { note: string }
async function generate(defaultPayload: Payload<"search">, sessionData: SessionData): Promise<Payload<"search">> {
    const extra: Extra = { note: "hi" };
    defaultPayload.message.note = extra.note as string;
    return defaultPayload;
}
`;
		const result = await compileUserCodeV2(source, "generate", { transpiler });
		expect(result.errors).toEqual([]);
		expect(result.ok).toBe(true);
		expect(result.js).toContain(
			"async function generate(defaultPayload, sessionData)",
		);
		expect(result.js).not.toMatch(
			/interface|: Payload|as string|use strict|sourceMappingURL/,
		);
		expect(result.jsBase64).toBe(
			Buffer.from(result.js as string).toString("base64"),
		);
		expect(result.compiler).toBe(`typescript@${ts.version}`);
		expect(result.jsHash).toMatch(/^[0-9a-f]{8}$/);
	});

	it("rejects import / export", async () => {
		const result = await compileUserCodeV2(
			`import { x } from "y";\nexport function generate(d: any) { return d; }`,
			"generate",
			{ transpiler },
		);
		expect(result.ok).toBe(false);
		expect(result.errors[0].message).toMatch(
			/import \/ export aren't supported/,
		);
	});

	it("reports sandbox violations at the TypeScript line", async () => {
		const source = [
			"type A = { a: string };", // 1, erased
			"type B = { b: string };", // 2, erased
			'function validate(targetPayload: Payload<"on_search">, sessionData: SessionData): StepCheckResult {', // 3
			'    eval("1");', // 4
			'    return { valid: true, code: 200, description: "ok" };',
			"}",
		].join("\n");
		const result = await compileUserCodeV2(source, "validate", { transpiler });
		expect(result.ok).toBe(false);
		const evalError = result.errors.find((e) => /eval/i.test(e.message));
		expect(evalError).toMatchObject({ line: 4 });
	});

	it("reports syntax errors instead of compiling", async () => {
		const result = await compileUserCodeV2("function generate( {", "generate", {
			transpiler,
		});
		expect(result.ok).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("still requires the named top-level function", async () => {
		const result = await compileUserCodeV2(
			"function generat(d: any) { return d; }",
			"generate",
			{
				transpiler,
			},
		);
		expect(result.ok).toBe(false);
		expect(result.errors[0].message).toMatch(/named 'generate'/);
	});

	it("warns when validate calls a helper (helpers only reach generate)", async () => {
		const source = `function validate(p: any, s: any): StepCheckResult {
    uuidv4();
    return { valid: true, code: 200, description: "ok" };
}`;
		const result = await compileUserCodeV2(source, "validate", {
			transpiler,
			helperNames: ["uuidv4"],
		});
		expect(result.ok).toBe(true);
		expect(result.warnings).toEqual(
			expect.arrayContaining([expect.objectContaining({ line: 2 })]),
		);
	});

	it("compiles helpers with the sandbox rules but no step-function warnings", async () => {
		const ok = await compileUserCodeV2(
			"/** Adds 18% GST. */\nfunction withGst(amount: number): number {\n    return Math.round(amount * 1.18);\n}\nfunction log(msg: string) {\n    console.log(msg);\n}\n",
			"helpers",
			{ transpiler },
		);
		expect(ok).toMatchObject({ ok: true, errors: [], warnings: [] });
		expect(ok.js).toContain("function withGst(amount)");

		const forbidden = await compileUserCodeV2(
			"function bad(): void {\n    eval('1');\n}\n",
			"helpers",
			{
				transpiler,
			},
		);
		expect(forbidden.ok).toBe(false);
		expect(forbidden.errors[0]).toMatchObject({ line: 2 });
	});

	it("runs end to end through the existing runner", async () => {
		const compiled = await compileUserCodeV2(
			`async function generate(defaultPayload: any, sessionData: any): Promise<any> {
    const tag: string = "typed";
    defaultPayload.message = { tag };
    return defaultPayload;
}`,
			"generate",
			{ transpiler },
		);
		expect(compiled.ok).toBe(true);
		const config = createInitialMockConfig("ONDC:TRV10", "2.1.0", "flow");
		config.steps = [
			{
				api: "search",
				action_id: "search_1",
				owner: "BAP",
				responseFor: null,
				unsolicited: false,
				description: "",
				mock: {
					generate: compiled.jsBase64 as string,
					validate: MockRunner.encodeBase64(
						'function validate(){ return { valid: true, code: 200, description: "ok" }; }',
					),
					requirements: MockRunner.encodeBase64(
						'function meetsRequirements(){ return { valid: true, code: 200, description: "ok" }; }',
					),
					defaultPayload: { context: {}, message: {} },
					saveData: {},
					inputs: {},
				},
			},
		] as any;
		const result = await new MockRunner(config, true).runGeneratePayload(
			"search_1",
		);
		expect(result.success).toBe(true);
		expect(result.result.message).toEqual({ tag: "typed" });
	}, 30000);
});

describe("getFunctionTemplateV2", () => {
	it.each(["generate", "validate", "meetsRequirements"] as const)(
		"%s template compiles and passes the sandbox checks",
		async (kind) => {
			const source = getFunctionTemplateV2(kind, { api: "on_search" });
			const result = await compileUserCodeV2(source, kind, { transpiler });
			expect(result.errors).toEqual([]);
			expect(source).toContain("sessionData: SessionData");
			if (kind !== "meetsRequirements")
				expect(source).toContain('Payload<"on_search">');
		},
	);

	it("types the raw session for code written against v1's session", () => {
		const source = getFunctionTemplateV2("generate", {
			api: "search",
			sessionView: "raw",
		});
		expect(source).toContain("sessionData: SessionDataRaw");
	});

	it("has a JSDoc-typed JavaScript variant", () => {
		const source = getFunctionTemplateV2("generate", {
			api: "search",
			language: "js",
		});
		expect(source).toContain(
			"async function generate(defaultPayload, sessionData)",
		);
		expect(source).toContain('@param {Payload<"search">} defaultPayload');
	});
});

describe("extractHelperDeclarationsV2", () => {
	it("declares top-level helpers with their JSDoc", () => {
		const { dts, names } = extractHelperDeclarationsV2(`/**
 * A v4 UUID.
 */
function uuidv4() { return "x"; }
async function fetchThing(url, opts = {}) { return url; }
const LIMIT = 3;
`);
		expect(names).toEqual(["uuidv4", "fetchThing", "LIMIT"]);
		expect(dts).toContain("A v4 UUID.");
		expect(dts).toContain("declare function uuidv4(): any;");
		expect(dts).toContain(
			"declare function fetchThing(url?: any, opts?: any): Promise<any>;",
		);
		expect(dts).toContain("declare const LIMIT: any;");
	});

	it("reports helpers it can't parse", () => {
		expect(extractHelperDeclarationsV2("function (").error).toBeDefined();
	});
});

describe("buildSessionViewV2", () => {
	const schema: SessionDataSchemaV2 = {
		id: "t",
		meta: { type: "session_schema" },
		keys: {
			city_code: { cardinality: "one" },
			items: { cardinality: "many" },
			empty: { cardinality: "one" },
			scalar: { cardinality: "one" },
			user_inputs: { builtin: true, cardinality: "one" },
		},
	};

	it("unwraps one-keys and leaves everything else (and the input) alone", () => {
		const stored = {
			city_code: ["std:080", "std:011"],
			items: [{ id: 1 }],
			empty: [],
			scalar: "already a value",
			user_inputs: [{ a: 1 }],
			undeclared: ["x"],
		};
		const before = JSON.stringify(stored);
		expect(buildSessionViewV2(stored, schema)).toEqual({
			city_code: "std:080",
			items: [{ id: 1 }],
			empty: undefined,
			scalar: "already a value",
			user_inputs: [{ a: 1 }],
			undeclared: ["x"],
		});
		expect(JSON.stringify(stored)).toBe(before);
	});

	it("is the stored session as-is without a schema", () => {
		const stored = { city_code: ["std:080"] };
		expect(buildSessionViewV2(stored)).toEqual(stored);
	});
});
