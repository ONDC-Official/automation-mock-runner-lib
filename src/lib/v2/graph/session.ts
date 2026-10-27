import { v4 as uuidv4 } from "uuid";

import type { TransactionData } from "../../types/base-config";
import type { GraphEventV2, GraphSessionModeV2, GraphSessionV2 } from "./types";

/** @experimental */
export interface CreateGraphSessionV2 {
	/** Defaults to a fresh uuid. Studio seeds it from the config's `transaction_data`. */
	transactionId?: string;
	mode: GraphSessionModeV2;
	journeyId?: string;
}

/** @experimental */
export const createGraphSessionV2 = ({
	transactionId,
	mode,
	journeyId,
}: CreateGraphSessionV2): GraphSessionV2 => ({
	transactionId:
		transactionId && transactionId.trim() !== "" ? transactionId : uuidv4(),
	mode,
	...(journeyId ? { journeyId } : {}),
	events: [],
	decisions: {},
	counters: {},
});

/** The last main-path event (on-demand / re-triggered runs are skipped). @experimental */
export const getLastMainEventV2 = (
	session: GraphSessionV2,
): GraphEventV2 | undefined => {
	for (let i = session.events.length - 1; i >= 0; i -= 1) {
		if (!session.events[i].extra) return session.events[i];
	}
	return undefined;
};

/** The latest event of a node, main path or not. @experimental */
export const getLatestEventV2 = (
	session: GraphSessionV2,
	nodeId: string,
): GraphEventV2 | undefined => {
	for (let i = session.events.length - 1; i >= 0; i -= 1) {
		if (session.events[i].nodeId === nodeId) return session.events[i];
	}
	return undefined;
};

/** @experimental */
export interface RebuildSessionOptionsV2 {
	transactionData?: Partial<TransactionData>;
	/** v1's `external_session_data`: merged over the saved keys. */
	external?: Record<string, unknown>;
}

/**
 * Session data as a step's functions see it, rebuilt from the events: every
 * event's `saved` folded in order (a later write wins; APPENDs were
 * concatenated when saved), then — as v1's playground does before a run —
 * the external session data plus `bapUri` / `bppUri` from the transaction
 * data, and `transaction_id` so code can read the run's id directly.
 *
 * @experimental
 */
export const rebuildSessionDataV2 = (
	session: GraphSessionV2,
	{ transactionData, external }: RebuildSessionOptionsV2 = {},
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const event of session.events) {
		for (const [key, value] of Object.entries(event.saved)) {
			if (key === "formData" && value && typeof value === "object") {
				out.formData = {
					...((out.formData as Record<string, unknown> | undefined) ?? {}),
					...(value as Record<string, unknown>),
				};
			} else {
				out[key] = value;
			}
		}
	}
	Object.assign(out, {
		...(external ?? {}),
		...(transactionData?.bap_uri ? { bapUri: transactionData.bap_uri } : {}),
		...(transactionData?.bpp_uri ? { bppUri: transactionData.bpp_uri } : {}),
	});
	if (out.transaction_id === undefined)
		out.transaction_id = session.transactionId;
	return out;
};

/** The node that last wrote each session key, from the events. @experimental */
export const getSessionProvenanceV2 = (
	session: GraphSessionV2,
): Record<string, string> => {
	const by: Record<string, string> = {};
	for (const event of session.events) {
		for (const key of Object.keys(event.saved)) by[key] = event.nodeId;
	}
	return by;
};
