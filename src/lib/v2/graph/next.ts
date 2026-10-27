import { getLastMainEventV2 } from "./session";
import type {
	ForkV2,
	GraphEdgeV2,
	GraphNodeV2,
	GraphSessionV2,
	JourneyV2,
	NextV2,
	ProtocolGraphV2,
} from "./types";

/** Lookup tables over a graph; build once per graph. @experimental */
export interface GraphIndexV2 {
	byId: Map<string, GraphNodeV2>;
	out: Map<string, GraphEdgeV2[]>;
	into: Map<string, GraphEdgeV2[]>;
}

/** @experimental */
export const indexGraphV2 = (graph: ProtocolGraphV2): GraphIndexV2 => {
	const byId = new Map(graph.nodes.map((node) => [node.id, node]));
	const out = new Map<string, GraphEdgeV2[]>();
	const into = new Map<string, GraphEdgeV2[]>();
	for (const edge of graph.edges) {
		if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
		out.set(edge.from, [...(out.get(edge.from) ?? []), edge]);
		into.set(edge.to, [...(into.get(edge.to) ?? []), edge]);
	}
	return { byId, out, into };
};

/** Wires that advance the main path: not on-demand, not into an on-demand node. */
const isMainWire = (edge: GraphEdgeV2, target: GraphNodeV2) =>
	edge.kind !== "on_demand" && target.kind !== "on_demand";

/** Whether a main-path wire leads into `node` (from a node that is not on-demand). */
export const hasMainWireIntoV2 = (
	node: GraphNodeV2,
	index: GraphIndexV2,
): boolean =>
	(index.into.get(node.id) ?? []).some((edge) => {
		const from = index.byId.get(edge.from);
		return from ? isMainWire(edge, node) && from.kind !== "on_demand" : false;
	});

/**
 * Where a run may start, requests first: the nodes marked `start` when any
 * is, else every node nothing main-path points at.
 */
export const getEntryNodesV2 = (
	graph: ProtocolGraphV2,
	index = indexGraphV2(graph),
): GraphNodeV2[] => {
	const candidates = graph.nodes.filter((node) => node.kind !== "on_demand");
	const marked = candidates.filter((node) => node.start);
	return (
		marked.length > 0
			? marked
			: candidates.filter((node) => !hasMainWireIntoV2(node, index))
	).sort((a, b) => Number(b.kind === "request") - Number(a.kind === "request"));
};

/** The node has run as many times as `repeat.max` allows. */
export const isRepeatExhaustedV2 = (
	node: GraphNodeV2,
	session: GraphSessionV2,
): boolean => {
	const max = node.repeat?.max;
	if (typeof max !== "number") return false;
	return (session.counters[node.id] ?? 0) >= max;
};

/**
 * What follows the last main-path step: the single next node, a decision's
 * decided case, a fork resolved by the journey or an earlier decision, or an
 * open fork for the host to ask about. On-demand nodes come back separately
 * and never block the path.
 *
 * @experimental
 */
export const nextStepsV2 = (
	graph: ProtocolGraphV2,
	session: GraphSessionV2,
	journey?: JourneyV2 | null,
	index = indexGraphV2(graph),
): NextV2 => {
	const onDemand = graph.nodes.filter(
		(node) =>
			node.kind === "on_demand" &&
			!isRepeatExhaustedV2(node, session) &&
			(!journey ||
				journey.onDemand.length === 0 ||
				journey.onDemand.includes(node.id)),
	);
	const done = (partial: Partial<NextV2>): NextV2 => ({
		auto: null,
		fork: null,
		onDemand,
		end: false,
		...partial,
	});

	const last = getLastMainEventV2(session);

	// Nothing ran yet: the journey's entry, else the graph's entry nodes.
	if (!last) {
		if (journey?.entry) {
			const entry = index.byId.get(journey.entry);
			return entry
				? done({ auto: entry })
				: done({
						reason: `Journey entry "${journey.entry}" is not on the graph`,
					});
		}
		const entries = getEntryNodesV2(graph, index);
		if (entries.length === 0)
			return done({ end: true, reason: "The graph has no entry node" });
		if (entries.length === 1) return done({ auto: entries[0] });
		const chosen = session.decisions.$entry;
		const picked = chosen
			? entries.find((node) => node.id === chosen)
			: undefined;
		if (picked) return done({ auto: picked });
		return done({
			fork: {
				key: "$entry",
				nodeId: "$entry",
				options: entries.map((target) => ({
					edge: {
						id: `$entry>${target.id}`,
						from: "$entry",
						to: target.id,
						kind: "next",
					},
					target,
				})),
			},
		});
	}

	const from = index.byId.get(last.nodeId);
	if (!from)
		return done({
			end: true,
			reason: `Node "${last.nodeId}" is no longer on the graph`,
		});

	// A repeat-until node whose exit condition isn't met yet runs again,
	// until its repeat limit; reaching the limit first is a failure.
	if (from.repeat?.until && last.exitMet === false) {
		const max = from.repeat.max;
		const runs = session.counters[from.id] ?? 0;
		if (typeof max === "number" && runs >= max) {
			return done({
				end: true,
				failed: true,
				reason: `The exit condition of "${from.id}" was not met after ${runs} run${runs === 1 ? "" : "s"}`,
			});
		}
		return done({ auto: from });
	}

	// The journey finishes here.
	if (journey?.exit === from.id) return done({ end: true });

	const canEnd = from.end === true;

	const wires = (index.out.get(from.id) ?? []).filter((edge) => {
		const target = index.byId.get(edge.to);
		return target ? isMainWire(edge, target) : false;
	});

	// A decision: follow the case its decide returned.
	if (from.kind === "decision") {
		const wire = wires.find((edge) => edge.case === last.case);
		if (!wire) {
			return done({
				end: wires.length === 0,
				reason: `Decision "${from.id}" decided "${last.case ?? ""}", which has no wire`,
			});
		}
		return done({ auto: index.byId.get(wire.to) ?? null, canEnd });
	}

	if (wires.length === 0) return done({ end: true, canEnd });

	const options = wires
		.map((edge) => ({ edge, target: index.byId.get(edge.to)! }))
		.filter(({ target }) => !isRepeatExhaustedV2(target, session));
	if (options.length === 0) {
		return done({
			end: true,
			canEnd,
			reason: `Every step after "${from.id}" has run its repeat limit`,
		});
	}
	if (options.length === 1) return done({ auto: options[0].target, canEnd });

	// Alternatives: the journey's choice, else a decision made in open mode.
	const chosen = journey?.choices[from.id] ?? session.decisions[from.id];
	const picked = chosen
		? options.find(({ target }) => target.id === chosen)
		: undefined;
	if (picked) return done({ auto: picked.target, canEnd });

	const fork: ForkV2 = { key: from.id, nodeId: from.id, options };
	return done({ fork, canEnd });
};
