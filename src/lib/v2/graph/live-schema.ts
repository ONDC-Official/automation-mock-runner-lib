import { z } from "zod";

import {
	TransactionDataSchema,
	type TransactionData,
} from "../../types/base-config";
import { MetaV2Schema, type MetaV2 } from "../types";
import type { JourneyV2, ProtocolGraphV2 } from "./types";

// What a live (mock) session of a v2 graph stores: the compiled graph, the
// journeys the tester picked, and what the executor needs to run them. Loose on
// purpose — the graph types are TypeScript interfaces that grow; this checks
// only what a host relies on to load a session, and keeps unknown keys.

const GraphNodeV2Schema = z.looseObject({
	id: z.string().min(1),
	api: z.string().min(1),
	owner: z.enum(["BAP", "BPP"]),
	kind: z.string().min(1),
});

const GraphEdgeV2Schema = z.looseObject({
	id: z.string().min(1),
	from: z.string().min(1),
	to: z.string().min(1),
	kind: z.string().min(1),
});

const JourneyV2Schema = z.looseObject({
	id: z.string().min(1),
	entry: z.string().min(1),
	choices: z.record(z.string(), z.string()),
	expects: z.record(z.string(), z.string()),
	onDemand: z.array(z.string()),
});

/**
 * A live session's graph document (`PLAYGROUND_V2_<sessionId>`): written by
 * Studio when it starts a live session, read by the mock service.
 *
 * @experimental
 */
export const LiveGraphConfigV2Schema = z.looseObject({
	kind: z.literal("graph-v2-live"),
	meta: MetaV2Schema.partial({ playground_version: true }).loose(),
	transaction_data: TransactionDataSchema,
	/** The compiled helpers, base64 JavaScript; prepended to `generate`. */
	helperLib: z.string().optional(),
	graph: z.looseObject({
		nodes: z.array(GraphNodeV2Schema),
		edges: z.array(GraphEdgeV2Schema),
	}),
	journeys: z.array(JourneyV2Schema).min(1),
	/** Editor-only data for the live page (layout, journey titles); hosts ignore it. */
	view: z.unknown().optional(),
});

/** @experimental */
export interface LiveGraphConfigV2 {
	kind: "graph-v2-live";
	meta: Omit<MetaV2, "playground_version"> & { playground_version?: "v2" };
	transaction_data: TransactionData;
	helperLib?: string;
	graph: ProtocolGraphV2;
	journeys: JourneyV2[];
	view?: unknown;
}

/** Parses a stored live document; throws a ZodError when it isn't one. @experimental */
export const parseLiveGraphConfigV2 = (value: unknown): LiveGraphConfigV2 =>
	LiveGraphConfigV2Schema.parse(value) as unknown as LiveGraphConfigV2;
