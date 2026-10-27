import type { TransactionData } from "../../types/base-config";
import type {
	GraphEdgeV2,
	GraphExecutorOptionsV2,
	GraphNodeKindV2,
	GraphNodeV2,
	JourneyV2,
	ProtocolGraphV2,
} from "./types";

// A v1 config is a linear graph. Typed structurally here — this module must
// not import v1's schema (the layering rule) — but every field is v1's.

/** @experimental */
export interface V1StepLikeV2 {
	api: string;
	action_id: string;
	owner: "BAP" | "BPP";
	responseFor: string | null;
	unsolicited?: boolean;
	description?: string;
	repeatCount?: number | null;
	mock: {
		generate: string;
		validate: string;
		requirements: string;
		defaultPayload?: unknown;
		saveData?: Record<string, string>;
		inputs?: { id?: string; jsonSchema?: unknown; sampleData?: unknown };
		formHtml?: string;
	};
}

/** @experimental */
export interface V1ConfigLikeV2 {
	meta: { domain: string; version: string; flowId?: string; flowName?: string };
	transaction_data: TransactionData;
	helperLib?: string;
	steps: V1StepLikeV2[];
	extra_steps?: { steps: V1StepLikeV2[] };
}

const kindOf = (step: V1StepLikeV2, onDemand: boolean): GraphNodeKindV2 => {
	if (onDemand) return "on_demand";
	if (/form/i.test(step.api)) return "form";
	if (step.unsolicited) return "unsolicited";
	if (step.responseFor) return "callback";
	return "request";
};

const toNode = (step: V1StepLikeV2, onDemand: boolean): GraphNodeV2 => ({
	id: step.action_id,
	api: step.api,
	owner: step.owner,
	kind: kindOf(step, onDemand),
	responseFor: step.responseFor ?? null,
	description: step.description ?? "",
	code: {
		generate: step.mock.generate,
		validate: step.mock.validate,
		requirements: step.mock.requirements,
	},
	defaultPayload: step.mock.defaultPayload ?? {},
	...(step.mock.inputs ? { inputs: step.mock.inputs } : {}),
	saveData: step.mock.saveData ?? {},
	...(step.mock.formHtml ? { formHtml: step.mock.formHtml } : {}),
	...(step.repeatCount ? { repeat: { max: step.repeatCount } } : {}),
});

/**
 * A v1 playground config as a graph: one node per step wired in order (a
 * request → its callback as a `response` wire), extra steps as on-demand
 * nodes, and the one journey that walks it. The executor then runs it with
 * v1's semantics.
 *
 * @experimental
 */
export const graphFromV1ConfigV2 = (
	config: V1ConfigLikeV2,
): {
	graph: ProtocolGraphV2;
	journey: JourneyV2;
	options: GraphExecutorOptionsV2;
} => {
	const main = config.steps.map((step) => toNode(step, false));
	const extra = (config.extra_steps?.steps ?? []).map((step) =>
		toNode(step, true),
	);
	const edges: GraphEdgeV2[] = [];
	main.forEach((node, index) => {
		const prev = main[index - 1];
		if (!prev) return;
		edges.push({
			id: `${prev.id}>${node.id}`,
			from: prev.id,
			to: node.id,
			kind:
				node.responseFor === prev.id
					? "response"
					: node.kind === "form"
						? "form"
						: "next",
		});
	});
	return {
		graph: { nodes: [...main, ...extra], edges },
		journey: {
			id: config.meta.flowId ?? "v1",
			title: config.meta.flowName ?? config.meta.flowId,
			entry: main[0]?.id ?? "",
			choices: {},
			expects: {},
			onDemand: extra.map((node) => node.id),
		},
		options: {
			domain: config.meta.domain,
			version: config.meta.version,
			transactionData: config.transaction_data,
			helperLib: config.helperLib,
			externalSessionData: config.transaction_data.external_session_data,
		},
	};
};
