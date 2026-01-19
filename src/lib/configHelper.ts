import { MockRunner } from "./MockRunner";
import { MockPlaygroundConfigType } from "./types/mock-config";
import { v4 as uuidv4 } from "uuid";
import { minify } from "terser";
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
		helperLib: MockRunner.encodeBase64(defaultHelpers),
	};
}

const defaultHelpers = `/*
	Custom helper functions available in all mock generation functions.
	these are appended below the generate function for each step.
*/

// Generates a UUID v4
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
	  const r = Math.random() * 16 | 0;
	  const v = c === 'x' ? r : (r & 0x3 | 0x8);
	  return v.toString(16);
	});
}

// Generate a 6 digit string ID
function generate6DigitId() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// Returns the current ISO timestamp
function currentTimestamp() {
	return new Date().toISOString();
}

// Converts ISO 8601 duration string to total seconds
const isoDurToSec = (duration) => {
  const durRE = /P((\d+)Y)?((\d+)M)?((\d+)W)?((\d+)D)?T?((\d+)H)?((\d+)M)?((\d+)S)?/;
  const s = durRE.exec(duration);
  if (!s) return 0;
  
  return (Number(s?.[2]) || 0) * 31536000 +
	(Number(s?.[4]) || 0) * 2628288 +
	(Number(s?.[6]) || 0) * 604800 +
	(Number(s?.[8]) || 0) * 86400 +
	(Number(s?.[10]) || 0) * 3600 +
	(Number(s?.[12]) || 0) * 60 +
	(Number(s?.[14]) || 0);
};`;

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
			repeat: step.repeatCount || 1,
		};

		if (
			step.mock.inputs !== undefined &&
			step.mock.inputs !== null &&
			Object.keys(step.mock.inputs).length > 0
		) {
			flowStep.input = [
				{
					name: step.mock.inputs.id,
					schema: step.mock.inputs.jsonSchema,
				},
			];
		}

		flowConfig.sequence.push(flowStep);
		index++;
	}
	return flowConfig;
}

export async function createOptimizedMockConfig(
	config: MockPlaygroundConfigType,
): Promise<MockPlaygroundConfigType> {
	const optimizedSteps = await Promise.all(
		config.steps.map(async (step) => {
			return {
				...step,
				mock: {
					...step.mock,
					generate: await getMinifiedCode(step.mock.generate),
					validate: await getMinifiedCode(step.mock.validate),
					requirements: await getMinifiedCode(step.mock.requirements),
				},
			};
		}),
	);

	const optimizedConfig: MockPlaygroundConfigType = {
		meta: config.meta,
		transaction_history: [],
		helperLib: config.helperLib,
		validationLib: config.validationLib,
		transaction_data: config.transaction_data,
		steps: optimizedSteps,
	};

	return optimizedConfig;
}

export async function getMinifiedCode(base64Code: string): Promise<string> {
	const decodedCode = MockRunner.decodeBase64(base64Code);
	const result = await minify(decodedCode);
	// If `minify` returns an object like { code: '...' }, return the string
	return MockRunner.encodeBase64(result.code || decodedCode);
}
