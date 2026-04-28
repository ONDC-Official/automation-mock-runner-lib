import { MockRunner } from "../lib/MockRunner";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";

describe("scratch: user-supplied validate fn", () => {
	afterEach(async () => {
		const shared = (MockRunner as any).sharedRunner;
		if (shared?.terminate) await shared.terminate();
		(MockRunner as any).sharedRunner = undefined;
	});

	it("runs the user's validate() against a payload and a null payload", async () => {
		const validateSrc = `function validate(targetPayload, sessionData) {
  if(!targetPayload){
    return {valid: false, code: 200, description: "oh no"};
  }
  return { valid: true, code: 200, description: "Valid request" };
}`;

		const config: MockPlaygroundConfigType = {
			meta: { domain: "ONDC:TRV14", version: "2.0.0", flowId: "testing" },
			transaction_data: {
				transaction_id: "e9e0b5cb-3f15-48a1-9d86-d4d643f0909d",
				latest_timestamp: "1970-01-01T00:00:00.000Z",
			},
			steps: [],
			transaction_history: [],
			validationLib: "",
			helperLib: "",
		};

		const runner = new MockRunner(config);
		const step = runner.getDefaultStep("search", "search_0");
		step.mock.validate = MockRunner.encodeBase64(validateSrc);
		runner.getConfig().steps.push(step);

		const r1 = await runner.runValidatePayloadWithSession(
			"search_0",
			{ context: {} },
			{},
		);
		console.log("WITH_PAYLOAD:", JSON.stringify(r1, null, 2));

		const r2 = await runner.runValidatePayloadWithSession("search_0", null, {});
		console.log("WITH_NULL:", JSON.stringify(r2, null, 2));

		expect(r1.success).toBe(true);
		expect(r2.success).toBe(true);
	}, 30000);
});
