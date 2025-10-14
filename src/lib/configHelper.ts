import { MockPlaygroundConfigType } from "./types/mock-config";
import { v4 as uuidv4 } from "uuid";
export function createInitialMockConfig(
	domain: string,
	version: string,
	flowId: string,
): MockPlaygroundConfigType {
	return {
		meta: {
			domain,
			version,
			flowId,
		},
		transaction_data: {
			transaction_id: uuidv4(),
			latest_timestamp: new Date(0).toISOString(),
			bap_id: "sample-bap-id",
			bap_uri: "https://bap.example.com",
			bpp_id: "sample-bpp-id",
			bpp_uri: "https://bpp.example.com",
		},
		steps: [],
		transaction_history: [],
		validationLib: "",
		helperLib: "",
	};
}

export function convertToFlowConfig(config: MockPlaygroundConfigType) {
	const flowConfig: any = {};
	flowConfig.id = config.meta.flowId;
	flowConfig.description = "";
	flowConfig.sequence = [];
	let index = 0;
	for (const step of config.steps) {
		const pair =
			config.steps.find((s) => s.responseFor === step.action_id)?.action_id ||
			null;
		const flowStep: any = {
			key: step.action_id,
			type: step.api,
			owner: step.owner,
			description: step.description || "",
			expect: index === 0 ? true : false,
			unsolicited: step.unsolicited,
			pair: pair,
		};

		if (
			step.mock.inputs !== undefined &&
			step.mock.inputs !== null &&
			Object.keys(step.mock.inputs).length > 0
		) {
			flowStep.input = {
				name: step.mock.inputs.id,
				schema: step.mock.inputs.jsonSchema,
			};
		}

		flowConfig.sequence.push(flowStep);
		index++;
	}
	return flowConfig;
}
