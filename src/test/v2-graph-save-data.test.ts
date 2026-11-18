import { MockRunner } from "../lib/MockRunner";
import { createInitialMockConfig } from "../lib/configHelper";
import { applyFormEntryV2, applySaveDataV2, GraphExecutorV2 } from "../lib/v2";

// v1 configs run through the graph executor, so its saveData must produce
// exactly what MockRunner.getSessionDataUpToStep produces for the same steps.

const getSave = `function getSave(payload) { return payload.message.items.map((i) => i.id).join(","); }`;

const payload1 = {
	context: { transaction_id: "tx-1", message_id: "m-1", bap_id: "bap" },
	message: { items: [{ id: "a" }, { id: "b" }], tag: "first" },
};
const payload2 = {
	context: { transaction_id: "tx-1", message_id: "m-2", bap_id: "bap" },
	message: { items: [{ id: "c" }], tag: "second" },
};

const saveData = {
	transactionId: "$.context.transaction_id",
	itemIds: "$.message.items[*].id",
	"APPEND#tags": "$.message.tag",
	joined: `EVAL#${MockRunner.encodeBase64(getSave)}`,
	missing: "$.message.nothing",
};

afterAll(async () => {
	const shared = (MockRunner as any).sharedRunner;
	if (shared?.terminate) await shared.terminate();
	(MockRunner as any).sharedRunner = undefined;
	GraphExecutorV2.terminateSharedRunner();
});

describe("applySaveDataV2", () => {
	it("matches MockRunner.getSessionDataUpToStep key for key", async () => {
		const config = createInitialMockConfig("ONDC:TRV14", "2.0.0", "flow");
		const runner = new MockRunner(config);
		const step1 = runner.getDefaultStep("search", "search");
		const step2 = runner.getDefaultStep("on_search", "on_search");
		step1.mock.saveData = saveData;
		step2.mock.saveData = saveData;
		config.steps = [step1, step2];
		config.transaction_history = [
			{
				action_id: "search",
				action: "search",
				payload: payload1,
				saved_info: {},
			},
			{
				action_id: "on_search",
				action: "on_search",
				payload: payload2,
				saved_info: {},
			},
		];
		const expected = await new MockRunner(config).getSessionDataUpToStep(2);

		const runGetSave = async (p: unknown, b64: string) =>
			(await MockRunner.runGetSave(p, b64)).result;
		const actual: Record<string, unknown> = {};
		const touched1 = await applySaveDataV2(
			saveData,
			payload1,
			actual,
			runGetSave,
			0,
		);
		const touched2 = await applySaveDataV2(
			saveData,
			payload2,
			actual,
			runGetSave,
			1,
		);

		expect(actual).toEqual(expected);
		expect(touched1).toEqual([
			"transactionId",
			"itemIds",
			"tags",
			"joined",
			"missing",
		]);
		expect(touched2).toEqual(touched1);
		expect(actual.tags).toEqual(["first", "second"]);
		expect(actual.joined).toBe("c");
		// jsonpath returns an empty match list, not undefined: v1 stores `[]`.
		expect(actual.missing).toEqual([]);
	});

	it("throws SessionDataError on a bad JSONPath", async () => {
		await expect(
			applySaveDataV2({ x: "$.[[[" }, payload1, {}, async () => undefined, 3),
		).rejects.toMatchObject({ name: "SessionDataError" });
	});

	it("skips keys whose path is empty", async () => {
		const into: Record<string, unknown> = {};
		const touched = await applySaveDataV2(
			{ x: "" },
			payload1,
			into,
			async () => undefined,
		);
		expect(touched).toEqual([]);
		expect(into).toEqual({});
	});
});

describe("applyFormEntryV2", () => {
	it("stores the submission under formData and its id under the node id, as v1 does", () => {
		const into: Record<string, unknown> = { formData: { earlier: { a: 1 } } };
		const touched = applyFormEntryV2("kyc_form", { name: "x" }, into, "sub-1");
		expect(touched).toEqual(["formData", "kyc_form"]);
		expect(into).toEqual({
			formData: { earlier: { a: 1 }, kyc_form: { name: "x" } },
			kyc_form: "sub-1",
		});
	});
});
