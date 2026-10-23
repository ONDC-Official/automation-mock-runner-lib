import fs from "fs";
import path from "path";
import ts from "typescript";

import {
	API_TYPES_FALLBACK_DTS_V2,
	generateApiTypesV2,
	generateSessionTypesV2,
	inferSessionSchemaV2,
	resolveJsonPathSchemaV2,
	SANDBOX_GLOBALS_DTS_V2,
	SESSION_TYPES_FALLBACK_DTS_V2,
	type SpecDocumentV2,
} from "../lib/v2";

/**
 * Real specs (request schemas + distinct saveData steps), fetched once from the
 * public config service so the suite runs offline; see each file's `source`.
 */
const loadSpec = (name: "trv10" | "fis12" | "log11") =>
	JSON.parse(
		fs.readFileSync(
			path.join(__dirname, "fixtures/specs", `${name}.json`),
			"utf8",
		),
	) as SpecDocumentV2 & {
		info: { domain: string; version: string; usecases: string[] };
		flows: any[];
	};

/** Type-checks in-memory files the way an editor would (ES2020, no DOM); returns the errors. */
const typecheck = (files: Record<string, string>): string[] => {
	const options: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2020,
		lib: ["lib.es2020.d.ts"],
		strict: true,
		noEmit: true,
		types: [],
	};
	const host = ts.createCompilerHost(options);
	const getSourceFile = host.getSourceFile;
	host.getSourceFile = (fileName, languageVersion, ...rest) =>
		fileName in files
			? ts.createSourceFile(fileName, files[fileName], languageVersion)
			: getSourceFile(fileName, languageVersion, ...rest);
	const fileExists = host.fileExists;
	host.fileExists = (fileName) => fileName in files || fileExists(fileName);
	const program = ts.createProgram(Object.keys(files), options, host);
	return ts
		.getPreEmitDiagnostics(program)
		.map(
			(d) =>
				`${d.file?.fileName ?? ""}(${
					d.file && d.start !== undefined
						? d.file.getLineAndCharacterOfPosition(d.start).line + 1
						: "?"
				}): ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
		);
};

describe("generateApiTypesV2", () => {
	it.each(["trv10", "fis12", "log11"] as const)(
		"types every API of %s",
		async (name) => {
			const spec = loadSpec(name);
			const { dts, apis, warnings } = await generateApiTypesV2(spec);
			expect(apis).toEqual(
				Object.keys(spec.paths ?? {})
					.map((p) => p.slice(1))
					.sort(),
			);
			expect(warnings).toEqual([]);
			expect(dts).toContain("declare namespace OndcApi {");
			expect(dts).toContain("type Payload<A extends string>");
			// Global declarations only: a module would hide them from step code.
			expect(dts).not.toMatch(/^(export|import) /m);
			expect(
				typecheck({ "api.d.ts": dts, "sandbox.d.ts": SANDBOX_GLOBALS_DTS_V2 }),
			).toEqual([]);
		},
	);

	it("is deterministic", async () => {
		const spec = loadSpec("fis12");
		const [a, b] = await Promise.all([
			generateApiTypesV2(spec),
			generateApiTypesV2(spec),
		]);
		expect(a.dts).toBe(b.dts);
		expect(a.specHash).toMatch(/^[0-9a-f]{8}$/);
	});

	it("types payloads strongly enough to catch mistakes (FIS12, Beckn-core $refs)", async () => {
		const { dts } = await generateApiTypesV2(loadSpec("fis12"));
		const errors = typecheck({
			"api.d.ts": dts,
			"use.ts": `
				declare const search: Payload<"search">;
				const city: string | undefined = search.context.location?.city?.code;
				const action: "select" = null as unknown as Payload<"select">["context"]["action"];
				// @ts-expect-error not in the schema
				search.message.no_such_field;
				// Unknown APIs (forms, custom) fall back to a loose payload.
				const form: Payload<"html_form"> = { context: {}, message: { anything: 1 } };
				export {};
			`,
		});
		expect(errors).toEqual([]);
	});

	it("types example-inferred specs (TRV10: inline, no $ref)", async () => {
		const { dts } = await generateApiTypesV2(loadSpec("trv10"));
		const errors = typecheck({
			"api.d.ts": dts,
			"use.ts": `
				declare const onSearch: Payload<"on_search">;
				const providers = onSearch.message?.catalog?.providers ?? [];
				// @ts-expect-error not in the schema
				onSearch.message?.catalog?.no_such_field;
				export {};
			`,
		});
		expect(errors).toEqual([]);
	});

	it("handles pointer refs, cycles and OpenAPI 3.0 nullable", async () => {
		const spec: SpecDocumentV2 = {
			paths: {
				"/search": {
					post: {
						requestBody: {
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Category" },
								},
							},
						},
					},
				},
			},
			components: {
				schemas: {
					Category: {
						type: "object",
						properties: {
							id: { type: "string" },
							// A ref to another schema's property, as FIS12 does.
							parent_category_id: {
								$ref: "#/components/schemas/Category/properties/id",
							},
							children: {
								type: "array",
								items: { $ref: "#/components/schemas/Category" },
							},
							note: { type: "string", nullable: true },
							count: { type: ["integer", "string"] },
						},
					},
				},
			},
		};
		const { dts } = await generateApiTypesV2(spec);
		const errors = typecheck({
			"api.d.ts": dts,
			"use.ts": `
				declare const p: Payload<"search">;
				const id: string | undefined = p.parent_category_id;
				const deep: string | undefined = p.children?.[0]?.children?.[0]?.id;
				const note: string | null | undefined = p.note;
				const count: number | string | undefined = p.count;
				export {};
			`,
		});
		expect(errors).toEqual([]);
	});

	it("has a fallback that keeps typed templates compiling without a spec", () => {
		const errors = typecheck({
			"api.d.ts": API_TYPES_FALLBACK_DTS_V2,
			"session.d.ts": SESSION_TYPES_FALLBACK_DTS_V2,
			"use.ts": `
				async function generate(defaultPayload: Payload<"search">, sessionData: SessionData): Promise<Payload<"search">> {
					defaultPayload.message.anything = sessionData.whatever;
					return defaultPayload;
				}
				export {};
			`,
		});
		expect(errors).toEqual([]);
	});
});

describe("resolveJsonPathSchemaV2", () => {
	const fis12 = loadSpec("fis12");
	const trv10 = loadSpec("trv10");

	it("follows $refs and allOf to a single leaf", () => {
		const result = resolveJsonPathSchemaV2(
			fis12,
			"search",
			"$.context.location.city.code",
		);
		expect(result.problem).toBeUndefined();
		expect(result.multi).toBe(false);
		expect(result.pointers.length).toBeGreaterThan(0);
		expect(result.pointers.every((p) => p.endsWith("/properties/code"))).toBe(
			true,
		);
	});

	it("marks filters, wildcards, unions and descendants as multi", () => {
		for (const jsonPath of [
			"$.message.intent.fulfillment.stops[?(@.type=='START')].location.gps",
			"$.message.intent.fulfillment.stops[*].type",
			"$.message.intent.fulfillment.stops[0,1].type",
			"$..city.code",
		]) {
			const result = resolveJsonPathSchemaV2(trv10, "search", jsonPath);
			expect({
				jsonPath,
				problem: result.problem,
				multi: result.multi,
			}).toEqual({
				jsonPath,
				problem: undefined,
				multi: true,
			});
		}
	});

	it("keeps an index as a single match", () => {
		const result = resolveJsonPathSchemaV2(
			trv10,
			"search",
			"$.message.intent.fulfillment.stops[0].type",
		);
		expect(result).toMatchObject({ multi: false });
		expect(result.pointers.length).toBeGreaterThan(0);
	});

	it("explains a path the schema doesn't have", () => {
		expect(
			resolveJsonPathSchemaV2(trv10, "search", "$.message.nope").problem,
		).toMatch(/"nope"/);
		expect(
			resolveJsonPathSchemaV2(trv10, "no_such_api", "$.context").problem,
		).toMatch(/no request schema/);
	});
});

describe("inferSessionSchemaV2 + generateSessionTypesV2", () => {
	it("infers TRV10 Ride-hailing's session from its flows", () => {
		const spec = loadSpec("trv10");
		const { schema, report } = inferSessionSchemaV2({
			spec,
			flows: spec.flows,
			domain: spec.info.domain,
			version: spec.info.version,
			usecase: "Ride-hailing",
		});
		expect(schema.id).toBe("trv10-2.1.0-ride-hailing");
		expect(schema.meta).toMatchObject({
			type: "session_schema",
			usecase: "Ride-hailing",
		});
		// Every saved key, plus the runner's builtins.
		expect(report.keys).toBe(100);
		expect(schema.keys.user_inputs).toMatchObject({ builtin: true });
		expect(schema.keys.formData).toMatchObject({ builtin: true });
		// A plain path is one match; a filter is many.
		expect(schema.keys.city_code.cardinality).toBe("one");
		expect(schema.keys.start_location.cardinality).toBe("many");
		// Saved from different paths: the key's type is the union.
		expect(report.conflicts.length).toBe(10);
		expect(report.conflicts.map((c) => c.key)).toContain("items");
	});

	it("types sessionData: stored lists, and a view with one-keys unwrapped", async () => {
		const spec = loadSpec("trv10");
		const { schema } = inferSessionSchemaV2({
			spec,
			flows: spec.flows,
			domain: spec.info.domain,
			version: spec.info.version,
			usecase: "Ride-hailing",
		});
		const [api, session] = await Promise.all([
			generateApiTypesV2(spec),
			generateSessionTypesV2(schema, spec),
		]);
		expect(session.dts).toContain("type SessionData = OndcSession.View;");
		const errors = typecheck({
			"api.d.ts": api.dts,
			"session.d.ts": session.dts,
			"use.ts": `
				declare const raw: SessionDataRaw;
				declare const view: SessionData;
				const fromRaw: string | undefined = raw.city_code?.[0];
				const fromView: string | undefined = view.city_code;
				const stops: string[] | undefined = view.start_location;
				// Open schema: undeclared keys are allowed.
				const extra: any = view.not_declared;
				// @ts-expect-error a one-key is no longer a list in the view
				view.city_code?.[0].toFixed;
				export {};
			`,
		});
		expect(errors).toEqual([]);
	});

	it("closes the type when the schema is closed", async () => {
		const spec = loadSpec("fis12");
		const { schema } = inferSessionSchemaV2({
			spec,
			flows: spec.flows,
			domain: spec.info.domain,
			version: spec.info.version,
			usecase: "LAMF LOAN",
		});
		schema.meta.closed = true;
		const [api, session] = await Promise.all([
			generateApiTypesV2(spec),
			generateSessionTypesV2(schema, spec),
		]);
		const errors = typecheck({
			"api.d.ts": api.dts,
			"session.d.ts": session.dts,
			"use.ts": `
				declare const view: SessionData;
				// @ts-expect-error closed: only declared keys
				view.not_declared;
				export {};
			`,
		});
		expect(errors).toEqual([]);
	});

	it("handles APPEND#, EVAL#, forms and keys read but never saved", () => {
		const encode = (s: string) => Buffer.from(s).toString("base64");
		const spec = loadSpec("trv10");
		const { schema, report } = inferSessionSchemaV2({
			spec,
			domain: "ONDC:TRV10",
			version: "2.1.0",
			flows: [
				{
					flowId: "f",
					steps: [
						{
							api: "search",
							action_id: "search_1",
							mock: {
								saveData: {
									"APPEND#cities": "$.context.location.city.code",
									consent: `EVAL#${encode("function getSave(p){return 1}")}`,
								},
								generate: encode(
									"async function generate(d, sessionData){ return sessionData.latest_ride_state }",
								),
							},
						},
						{ api: "html_form", action_id: "kyc_form" },
					],
				},
			],
		});
		expect(schema.keys.cities).toMatchObject({ cardinality: "many" });
		expect(schema.keys.cities.sources?.[0]).toMatchObject({ append: true });
		expect(schema.keys.consent).toMatchObject({ status: "unresolved" });
		expect(schema.keys.consent.cardinality).toBeUndefined();
		expect(schema.keys.kyc_form).toMatchObject({
			builtin: true,
			schema: { type: "string" },
		});
		expect(schema.keys.latest_ride_state).toMatchObject({
			status: "unresolved",
		});
		expect(report).toMatchObject({
			evalKeys: ["consent"],
			readNeverSaved: ["latest_ride_state"],
		});
	});
});
