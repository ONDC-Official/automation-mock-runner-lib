import jsonpath from "jsonpath";

import { SessionDataError } from "../../utils/errors";

// Must match v1's `MockRunner.getSessionDataUpToStep` key for key: v1 configs
// run through the graph executor and must see the same session data.
// `v2-graph-save-data.test.ts` asserts the parity against MockRunner itself.

/** Runs a base64 `getSave(payload)` and returns its result (undefined on failure). @experimental */
export type GetSaveRunnerV2 = (
	payload: unknown,
	base64Code: string,
) => Promise<unknown>;

const APPEND_PREFIX = "APPEND#";
const EVAL_PREFIX = "EVAL#";

/**
 * Applies a node's `saveData` to `into` from `payload`, v1-style:
 * - a JSONPath stores its match list (an array, even for one match);
 * - `APPEND#key` concatenates onto what `into[key]` already holds;
 * - `EVAL#<base64>` stores whatever `getSave(payload)` returns;
 * - no match stores `null`; a bad path throws `SessionDataError`.
 *
 * Returns the keys written, so a caller can record just this step's writes.
 *
 * @experimental
 */
export async function applySaveDataV2(
	saveData: Record<string, string> | undefined,
	payload: unknown,
	into: Record<string, unknown>,
	runGetSave: GetSaveRunnerV2,
	stepIndex = -1,
): Promise<string[]> {
	const touched: string[] = [];
	// jsonpath asserts `obj instanceof Object`, which fails for an object from
	// another realm (a worker's message under jest's vm sandbox). Re-parse those.
	const obj =
		payload instanceof Object || payload === null || payload === undefined
			? payload
			: (JSON.parse(JSON.stringify(payload)) as unknown);
	for (const key in saveData ?? {}) {
		const path = saveData![key];
		if (!path || typeof path !== "string") continue;
		const isAppend = key.startsWith(APPEND_PREFIX);
		const isEval = path.startsWith(EVAL_PREFIX);
		// v1 reads `split("#")[1]` for both, so the base64 is what follows the first `#`.
		const actualKey = isAppend ? key.split("#")[1] : key;
		try {
			const values = isEval
				? await runGetSave(payload, path.split("#")[1])
				: jsonpath.query(obj as object, path);
			if (values !== undefined) {
				into[actualKey] = isAppend
					? ((into[actualKey] as unknown[] | undefined) || []).concat(values)
					: values;
			} else {
				into[actualKey] = null;
			}
			touched.push(actualKey);
		} catch (error) {
			throw new SessionDataError(
				`Failed to extract session data at step ${stepIndex}, key '${key}' with path '${path}': ${(error as Error).message}`,
				stepIndex,
				path,
			);
		}
	}
	return touched;
}

/**
 * What a form step writes, v1-style: the submission under `formData[nodeId]`
 * and its submission id under `nodeId`. Returns the keys written.
 *
 * @experimental
 */
export function applyFormEntryV2(
	nodeId: string,
	formData: unknown,
	into: Record<string, unknown>,
	submissionId: string,
): string[] {
	const forms =
		into.formData && typeof into.formData === "object"
			? { ...(into.formData as Record<string, unknown>) }
			: {};
	forms[nodeId] = formData;
	into.formData = forms;
	into[nodeId] = submissionId;
	return ["formData", nodeId];
}
