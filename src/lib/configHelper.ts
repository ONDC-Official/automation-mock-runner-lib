import { MockRunner } from "./MockRunner";
import { MockPlaygroundConfigType } from "./types/mock-config";
import { v4 as uuidv4 } from "uuid";
import { minify } from "terser";
import { Flow } from "./types/flow-types";
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
			bap_id: "bap.example.com",
			bap_uri: "https://bap.example.com",
			bpp_id: "bpp.example.com",
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

const createFormURL = (domain,formId, sessionData) => {
	const baseURL = sessionData.mockBaseUrl;
	const transactionId = sessionData.transactionId[0];
	const sessionId = sessionData.sessionId;
	return \`\${baseURL}/forms/\${domain}/\${formId}/?transaction_id=\${transactionId}&session_id=\${sessionId}\`;
}

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

		let flowStep: any = {};
		if (step.api === "dynamic_form") {
			flowStep = {
				key: step.action_id,
				type: "DYNAMIC_FORM",
				owner: step.owner,
				description: step.description || "",
				label: step.description || "FORM",
				unsolicited: step.unsolicited,
				pair: pair,
				repeat: step.repeatCount || 1,
				input: [
					{
						name: "form_submission_id",
						label: "Enter form submission ID",
						type: "DYNAMIC_FORM",
						payloadField: "form_submission_id",
						reference: `$.reference_data.${step.action_id}`,
					},
				],
			};
		} else {
			flowStep = {
				key: step.action_id,
				type: step.api,
				owner: step.owner,
				description: step.description || "",
				expect: index === 0 ? true : false,
				unsolicited: step.unsolicited,
				pair: pair,
				repeat: step.repeatCount || 1,
			};
		}
		if (
			step.mock.inputs !== undefined &&
			step.mock.inputs !== null &&
			Object.keys(step.mock.inputs).length > 0
		) {
			flowStep.input = [
				{
					name: step.mock.inputs.id,
					type: step.mock.inputs.id,
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

type PayloadType = {
	context: {
		action: string;
		timestamp: string;
		domain: string;
		version?: string;
		core_version?: string;
	};
};

/**
 * Generates a playground configuration from a flow configuration and payloads.
 *
 * This function takes an array of payloads and a flow configuration, then creates
 * a mock playground configuration by mapping payloads to their corresponding flow steps.
 * Payloads are sorted by timestamp and matched to flow sequence steps by action type.
 *
 * @param payloads - Array of payload objects containing context and action information
 * @param flowConfig - Flow configuration object containing sequence of steps and flow metadata
 *
 * @returns A promise that resolves to a MockPlaygroundConfigType object configured with
 *          the mapped steps and their corresponding payloads
 *
 * @throws {Error} When insufficient payloads are provided for the flow sequence
 * @throws {Error} When no payload is found for a required action type in the flow
 *
 * @example
 * ```typescript
 * const payloads = [{ context: { action: 'search', timestamp: '2023-01-01' } }];
 * const flowConfig = { id: 'flow1', sequence: [{ type: 'search', key: 'step1' }] };
 * const config = await generatePlaygroundConfigFromFlowConfig(payloads, flowConfig);
 * ```
 */
export async function generatePlaygroundConfigFromFlowConfig(
	payloads: PayloadType[],
	flowConfig: Flow,
) {
	flowConfig = JSON.parse(JSON.stringify(flowConfig)) as Flow;
	flowConfig.sequence = flowConfig.sequence.filter(
		(step) => step.type !== "HTML_FORM" && step.type !== "DYNAMIC_FORM",
	);
	payloads = payloads.sort(
		(a, b) =>
			new Date(a.context.timestamp).getTime() -
			new Date(b.context.timestamp).getTime(),
	);
	const domain = payloads[0].context.domain;
	const version =
		payloads[0].context.version || payloads[0].context.core_version || "1.0.0";
	const config: MockPlaygroundConfigType = createInitialMockConfig(
		domain,
		version,
		`${flowConfig.id}_logs_flow_${domain}_v${version}`,
	);
	const mockRunner = new MockRunner(config);

	for (const step of flowConfig.sequence) {
		if (
			step.type === "HTML_FORM" ||
			step.type === "DYNAMIC_FORM" ||
			step.type === "FORM"
		) {
			continue;
		}
		let stepPayload = payloads.findIndex((p) => p.context.action === step.type);
		const payload = stepPayload === -1 ? {} : payloads[stepPayload];
		if (stepPayload === -1) {
			payloads.splice(stepPayload, 1); // remove used payload
		}
		const stepConfig = mockRunner.getDefaultStep(step.type, step.key);
		stepConfig.mock.inputs = {};
		stepConfig.mock.defaultPayload = payload;
		const findResponseFor = flowConfig.sequence.find(
			(s) => s.pair === step.key,
		);
		stepConfig.responseFor = findResponseFor ? findResponseFor.key : null;
		stepConfig.unsolicited = step.unsolicited;
		config.steps.push(stepConfig);
	}
	return config;
}
