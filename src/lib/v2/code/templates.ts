import { getFunctionSchema } from "../../constants/function-registry";

/** The step functions a V2 node writes. @experimental */
export type StepFunctionKindV2 = "generate" | "validate" | "meetsRequirements";

/** @experimental */
export interface FunctionTemplateOptionsV2 {
	/** The node's API: types `defaultPayload` / `targetPayload` as `Payload<"<api>">`. */
	api: string;
	/** `ts` (default) annotates the signature; `js` uses JSDoc types instead. */
	language?: "ts" | "js";
	/**
	 * `typed` (default): `sessionData` is the V2 view (`SessionData`, `one` keys
	 * unwrapped). `raw`: as stored (`SessionDataRaw`, every key a match list), for
	 * code written against v1's session data.
	 */
	sessionView?: "typed" | "raw";
}

const quote = (api: string) => JSON.stringify(api);

/**
 * A new node's step function, typed from the spec: e.g. for `search`,
 *
 * ```ts
 * async function generate(defaultPayload: Payload<"search">, sessionData: SessionData): Promise<Payload<"search">> {
 * ```
 *
 * Bodies are the v1 defaults (`getFunctionSchema(kind).defaultBody`), so a new
 * node behaves exactly like a new v1 step.
 *
 * @experimental
 */
export const getFunctionTemplateV2 = (
	kind: StepFunctionKindV2,
	{ api, language = "ts", sessionView = "typed" }: FunctionTemplateOptionsV2,
): string => {
	const body = getFunctionSchema(kind).defaultBody.replace(/^\s+/, "");
	const session = sessionView === "raw" ? "SessionDataRaw" : "SessionData";
	const payload = `Payload<${quote(api)}>`;
	const ts = language === "ts";

	// JSDoc tags: the type goes in braces only in JS, where it is the only type.
	const tag = (name: string, type: string, text: string) =>
		` * @${name} ${ts ? "" : `{${type}} `}${text}`;
	const sessionTag = tag(
		"param",
		session,
		`sessionData ${
			sessionView === "raw"
				? "Values saved by earlier steps, as stored: each JSONPath a list of matches."
				: "Values saved by earlier steps (see the session schema)."
		}`,
	);
	const fn = (signature: string, typedSignature: string) =>
		`${ts ? typedSignature : signature} {\n    ${body}\n}\n`;

	switch (kind) {
		case "generate":
			return [
				"/**",
				` * Builds the ${api} payload this step sends.`,
				tag(
					"param",
					payload,
					"defaultPayload The step's default payload; the runner fills in `context`.",
				),
				sessionTag,
				tag("returns", `Promise<${payload}>`, "The payload to send."),
				" */",
				fn(
					"async function generate(defaultPayload, sessionData)",
					`async function generate(defaultPayload: ${payload}, sessionData: ${session}): Promise<${payload}>`,
				),
			].join("\n");
		case "validate":
			return [
				"/**",
				` * Checks the ${api} payload this step receives.`,
				tag("param", payload, "targetPayload The payload received."),
				sessionTag,
				tag(
					"returns",
					"StepCheckResult",
					"`valid: false` rejects it with `code` and `description`.",
				),
				" */",
				fn(
					"function validate(targetPayload, sessionData)",
					`function validate(targetPayload: ${payload}, sessionData: ${session}): StepCheckResult`,
				),
			].join("\n");
		case "meetsRequirements":
			return [
				"/**",
				` * Whether ${api} can run yet, given what earlier steps saved.`,
				sessionTag,
				tag(
					"returns",
					"StepCheckResult",
					"`valid: false` holds the step back.",
				),
				" */",
				fn(
					"function meetsRequirements(sessionData)",
					`function meetsRequirements(sessionData: ${session}): StepCheckResult`,
				),
			].join("\n");
	}
};
