import { MockRunner } from "./MockRunner";
import { MockPlaygroundConfigType } from "./types/mock-config";
import { v4 as uuidv4 } from "uuid";
import { minify } from "terser";
import { Flow } from "./types/flow-types";
import { validateGoodConfig } from "./utils/validateConfig";
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
			config_version: "0.0.0001",
			description: "",
			use_case_id: "",
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
};

const setCityFromInputs = (payload, inputs) => {
	if (!inputs) return "*";
	let version = payload.context.version || payload.context.core_version || "2.0.0";
	if (version.startsWith("1")) {
		payload.context.city = inputs.city_code ?? "*";
	} else {
		payload.context.location.city.code = inputs.city_code ?? "*";
	}
}
`;

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
		const isFormStep = [
			"HTML_FORM",
			"DYNAMIC_FORM",
			"HTML_FORM_MULTI",
			"dynamic_form",
			"html_form",
		];

		// Check if previous step was a form step
		const previousStep = index > 0 ? config.steps[index - 1] : null;
		const isPreviousStepForm =
			previousStep !== null && isFormStep.includes(previousStep.api);

		// Check if current step has no inputs
		const hasNoInputs =
			step.mock.inputs === undefined ||
			step.mock.inputs === null ||
			Object.keys(step.mock.inputs).length === 0;

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
		} else if (step.api === "HTML_FORM" || step.api === "html_form") {
			flowStep = {
				key: step.action_id,
				type: "HTML_FORM",
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
						type: "HTML_FORM",
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

		if (step.mock.inputs?.oldInputs) {
			flowStep.input = step.mock.inputs.oldInputs;
		}

		// Add force_proceed if previous step was a form and current step has no inputs
		if (isPreviousStepForm && hasNoInputs) {
			flowStep.force_proceed = true;
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
async function buildConfigFromFlowConfig(
	payloads: PayloadType[],
	flowConfig: Flow,
	domain: string,
	version: string,
	addInputs: boolean = true,
): Promise<MockPlaygroundConfigType> {
	flowConfig = JSON.parse(JSON.stringify(flowConfig)) as Flow;
	payloads = [...payloads].sort(
		(a, b) =>
			new Date(a.context.timestamp).getTime() -
			new Date(b.context.timestamp).getTime(),
	);
	const config: MockPlaygroundConfigType = createInitialMockConfig(
		domain,
		version,
		`${flowConfig.id}`,
	);
	const mockRunner = new MockRunner(config);

	let index = 0;
	for (const step of flowConfig.sequence) {
		const isFormStep =
			step.type === "HTML_FORM" ||
			step.type === "DYNAMIC_FORM" ||
			step.type === "FORM" ||
			step.type === "HTML_FORM_MULTI";

		let stepConfig;
		if (isFormStep) {
			// HTML_FORM is not yet fully implemented — fall back to dynamic_form default
			stepConfig = mockRunner.getDefaultStep(
				step.type,
				step.key,
				"dynamic_form",
			);
			stepConfig.mock.inputs.oldInputs = step.input;
			stepConfig.owner = step.owner;
		} else {
			stepConfig = mockRunner.getDefaultStep(step.type, step.key);
			if (index === 0 && addInputs) {
				stepConfig.mock.generate = MockRunner.encodeBase64(
					`async function generate(defaultPayload, sessionData) {
  	setCityFromInputs(defaultPayload, sessionData.user_inputs);
  return defaultPayload;
  }`,
				);
				stepConfig.mock.inputs = cityInputs;
			} else {
				stepConfig.mock.inputs = {};
				if (step.input && step.input.length > 0 && step.input[0].jsonSchema) {
					stepConfig.mock.inputs = step.input[0];
				} else if (step.input && step.input.length > 0) {
					stepConfig.mock.inputs.oldInputs = step.input;
					stepConfig.mock.inputs.id = `old_inputs`;
				}
			}
			const stepPayloadIndex = payloads.findIndex(
				(p) => p.context.action === step.type,
			);
			if (stepPayloadIndex !== -1) {
				stepConfig.mock.defaultPayload = payloads[stepPayloadIndex];
				payloads.splice(stepPayloadIndex, 1); // remove used payload
			}
			index++;
		}

		const findResponseFor = flowConfig.sequence.find(
			(s) => s.pair === step.key,
		);
		stepConfig.responseFor = findResponseFor ? findResponseFor.key : null;
		stepConfig.unsolicited = step.unsolicited;
		config.steps.push(stepConfig);
	}
	config.meta.description = flowConfig.description || "";
	return config;
}

export async function generatePlaygroundConfigFromFlowConfig(
	payloads: PayloadType[],
	flowConfig: Flow,
): Promise<MockPlaygroundConfigType> {
	if (payloads.length === 0) {
		throw new Error(
			"payloads must not be empty. Use generatePlaygroundConfigFromFlowConfigWithMeta to supply domain and version explicitly.",
		);
	}
	const domain = payloads[0].context.domain;
	const version =
		payloads[0].context.version || payloads[0].context.core_version || "1.0.0";
	return buildConfigFromFlowConfig(payloads, flowConfig, domain, version);
}

export async function generatePlaygroundConfigFromFlowConfigWithMeta(
	payloads: PayloadType[],
	flowConfig: Flow,
	domain: string,
	version: string,
): Promise<MockPlaygroundConfigType> {
	return buildConfigFromFlowConfig(
		payloads,
		flowConfig,
		domain,
		version,
		false,
	);
}

const cityInputs = {
	id: "ExampleInputId",
	jsonSchema: {
		$schema: "https://json-schema.org/draft-07/schema",
		type: "object",
		properties: {
			city_code: {
				type: "string",
				description: "",
			},
		},
		required: ["city_code"],
	},
};

export function validateConfigForDeployment(
	config: MockPlaygroundConfigType,
): void {
	validateGoodConfig(config);
}
