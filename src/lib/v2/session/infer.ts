import * as acorn from "acorn";
import * as walk from "acorn-walk";

import { decode } from "../../utils/base64";
import { resolveJsonPathSchemaV2 } from "../typegen/jsonpath-schema";
import type { SpecDocumentV2 } from "../typegen/spec";
import {
	getSessionSchemaIdV2,
	type SessionDataSchemaV2,
	type SessionKeySourceV2,
	type SessionKeyV2,
} from "./schema";

/** A step as published flows carry it (`x-flows[].config.steps[]`), or flattened. */
export interface SessionInferenceStepV2 {
	api: string;
	action_id?: string;
	saveData?: Record<string, string>;
	mock?: {
		saveData?: Record<string, string>;
		generate?: string;
		validate?: string;
		requirements?: string;
	};
}

/** A published flow (`x-flows[]`), with its steps inline or under `config`. */
export interface SessionInferenceFlowV2 {
	flowId?: string;
	id?: string;
	usecase?: string;
	steps?: SessionInferenceStepV2[];
	config?: { steps?: SessionInferenceStepV2[] };
}

/** @experimental */
export interface SessionInferenceReportV2 {
	flows: number;
	steps: number;
	keys: number;
	/** Keys saved from more than one path: their type is a union. */
	conflicts: Array<{ key: string; paths: string[] }>;
	/** Sources whose JSONPath didn't resolve against the API's schema. */
	unresolved: Array<{
		key: string;
		api: string;
		path: string;
		problem: string;
	}>;
	/** Keys filled by an `EVAL#` extractor: untyped until curated. */
	evalKeys: string[];
	/** Keys read by step code (`sessionData.x`) that no step saves. */
	readNeverSaved: string[];
}

/** @experimental */
export interface InferSessionSchemaInputV2 {
	spec: SpecDocumentV2;
	flows: SessionInferenceFlowV2[];
	domain: string;
	version: string;
	/** Only flows of this use case; all flows when absent. Compared loosely (case, spacing). */
	usecase?: string;
	id?: string;
	/** Recorded in `meta.generated.tool`. */
	tool?: string;
}

const FORM_APIS = new Set(["dynamic_form", "html_form", "html_form_multi"]);

const sameUsecase = (a?: string, b?: string) =>
	(a ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "") ===
	(b ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** `sessionData.<key>` / `sessionData["<key>"]` reads in a base64 function. */
const readSessionKeys = (base64?: string): string[] => {
	if (!base64) return [];
	let ast: acorn.Node;
	try {
		ast = acorn.parse(decode(base64), {
			ecmaVersion: 2020,
			sourceType: "script",
		});
	} catch {
		return [];
	}
	const keys: string[] = [];
	walk.simple(ast, {
		MemberExpression(node: any) {
			if (
				node.object?.type !== "Identifier" ||
				node.object.name !== "sessionData"
			)
				return;
			if (!node.computed && node.property?.type === "Identifier")
				keys.push(node.property.name);
			if (node.computed && typeof node.property?.value === "string") {
				keys.push(node.property.value);
			}
		},
	});
	return keys;
};

/**
 * Infers a use case's session-data schema from its published flows: every
 * `saveData` key becomes a session key, typed by resolving its JSONPath against
 * the API's request schema. A starting point to curate, not the final word:
 *
 * - a key saved from several paths gets every source (its type is the union);
 * - `cardinality: one` is suggested when no source can match more than one node;
 * - `APPEND#key` keys stay `many`, `EVAL#` keys are `unresolved`;
 * - keys the step code reads but nothing saves are added as `unresolved`.
 *
 * @experimental
 */
export const inferSessionSchemaV2 = ({
	spec,
	flows,
	domain,
	version,
	usecase,
	id,
	tool = "@ondc/automation-mock-runner inferSessionSchemaV2",
}: InferSessionSchemaInputV2): {
	schema: SessionDataSchemaV2;
	report: SessionInferenceReportV2;
} => {
	const chosen = usecase
		? flows.filter((flow) => sameUsecase(flow.usecase, usecase))
		: flows;

	const keys: Record<string, SessionKeyV2> = {
		user_inputs: {
			builtin: true,
			description:
				"The step's form inputs (generate only; set when the step has inputs).",
			schema: { type: "object", additionalProperties: true },
		},
		formData: {
			builtin: true,
			description:
				"Submitted form payloads, keyed by the form step's action id.",
			schema: { type: "object", additionalProperties: true },
		},
	};
	const unresolved: SessionInferenceReportV2["unresolved"] = [];
	const multi = new Map<string, boolean>();
	const read = new Set<string>();
	let steps = 0;

	for (const flow of chosen) {
		for (const step of flow.steps ?? flow.config?.steps ?? []) {
			steps += 1;
			for (const code of [
				step.mock?.generate,
				step.mock?.validate,
				step.mock?.requirements,
			]) {
				readSessionKeys(code).forEach((key) => read.add(key));
			}
			if (FORM_APIS.has(step.api?.toLowerCase()) && step.action_id) {
				keys[step.action_id] ??= {
					builtin: true,
					description: `Submission id of the ${step.action_id} form.`,
					schema: { type: "string" },
				};
				continue;
			}

			const saveData = step.mock?.saveData ?? step.saveData ?? {};
			for (const [rawKey, path] of Object.entries(saveData)) {
				if (typeof path !== "string") continue;
				const append = rawKey.startsWith("APPEND#");
				const key = append ? rawKey.split("#")[1] : rawKey;
				const isEval = path.startsWith("EVAL#");
				const entry = (keys[key] ??= { status: "inferred", sources: [] });
				const sources = (entry.sources ??= []);
				if (sources.some((s) => s.api === step.api && s.path === path))
					continue;

				const source: SessionKeySourceV2 = {
					...((flow.flowId ?? flow.id) ? { flow: flow.flowId ?? flow.id } : {}),
					...(step.action_id ? { action: step.action_id } : {}),
					api: step.api,
					path,
					...(isEval ? { eval: true } : {}),
					...(append ? { append: true } : {}),
				};
				sources.push(source);

				if (isEval) {
					entry.status = "unresolved";
					continue;
				}
				const resolved = resolveJsonPathSchemaV2(spec, step.api, path);
				if (resolved.problem) {
					unresolved.push({
						key,
						api: step.api,
						path,
						problem: resolved.problem,
					});
				}
				multi.set(key, (multi.get(key) ?? false) || resolved.multi || append);
			}
		}
	}

	for (const [key, entry] of Object.entries(keys)) {
		if (entry.builtin || !entry.sources) continue;
		const isEval = entry.sources.every((source) => source.eval);
		if (!isEval) entry.cardinality = multi.get(key) ? "many" : "one";
	}

	const readNeverSaved = [...read].filter((key) => !(key in keys)).sort();
	for (const key of readNeverSaved) {
		keys[key] = {
			status: "unresolved",
			description: "Read by step code, but no step saves it.",
		};
	}

	const sorted = Object.fromEntries(
		Object.entries(keys).sort(([a], [b]) => a.localeCompare(b)),
	);
	const schema: SessionDataSchemaV2 = {
		id: id ?? getSessionSchemaIdV2(domain, version, usecase),
		meta: {
			type: "session_schema",
			schema_version: 1,
			domain,
			version,
			...(usecase ? { usecase } : {}),
			description: "",
			closed: false,
			generated: { tool, flows: chosen.length },
		},
		keys: sorted,
	};

	return {
		schema,
		report: {
			flows: chosen.length,
			steps,
			keys: Object.keys(sorted).length,
			conflicts: Object.entries(sorted)
				.map(([key, entry]) => ({
					key,
					paths: [
						...new Set((entry.sources ?? []).map((s) => `${s.api}: ${s.path}`)),
					],
				}))
				.filter(
					(conflict) =>
						new Set(conflict.paths.map((p) => p.split(": ")[1])).size > 1,
				),
			unresolved,
			evalKeys: Object.entries(sorted)
				.filter(([, entry]) => entry.sources?.some((s) => s.eval))
				.map(([key]) => key),
			readNeverSaved,
		},
	};
};
