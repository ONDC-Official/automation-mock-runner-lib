import type { ExecutionResult } from "../../types/execution-results";
import type { TransactionData } from "../../types/base-config";

// The protocol graph the v2 executor runs. Flat: a host that authors groups
// (Protocol Studio) resolves their boundaries before handing the graph over,
// so the executor never sees sub-graphs. Every field a node's step functions
// need maps 1:1 to a v1 step (`code.*` are base64 JavaScript, `saveData` is
// v1's map), which is what lets `graphFromV1ConfigV2` run old configs.

/** @experimental */
export type GraphOwnerV2 = "BAP" | "BPP";

/**
 * - `request` / `callback` / `unsolicited` / `on_demand`: one API message; a
 *   callback answers `responseFor` and reuses its message_id.
 * - `form`: the tester fills a form; its submission is the "payload".
 * - `decision`: a protocol decision — `code.decide(sessionData)` returns the
 *   case whose wire is followed. Produces no payload.
 *
 * @experimental
 */
export type GraphNodeKindV2 =
	| "request"
	| "callback"
	| "unsolicited"
	| "on_demand"
	| "form"
	| "decision";

/** @experimental */
export type GraphEdgeKindV2 =
	| "response"
	| "next"
	| "optional"
	| "branch"
	| "on_demand"
	| "form"
	| "error"
	| "terminal"
	| "mount";

/** @experimental */
export interface GraphNodeCodeV2 {
	/** `async function generate(defaultPayload, sessionData)`, base64 JavaScript. */
	generate?: string;
	/** `function validate(targetPayload, sessionData)`, base64 JavaScript. */
	validate?: string;
	/** `function meetsRequirements(sessionData)`, base64 JavaScript (v1 calls the file `requirements`). */
	requirements?: string;
	/** Decision nodes only: `function decide(sessionData)`, base64 JavaScript. */
	decide?: string;
	/**
	 * `function match(payload, sessionData)`, base64 JavaScript: whether an
	 * incoming payload is this step at all. Absent = accepts any payload of
	 * its API. Consulted by `recognise` where several steps are possible next.
	 */
	match?: string;
	/**
	 * `function exit(payload, sessionData)`, base64 JavaScript: run after each
	 * run of a `repeat.until` node; the node runs again until it returns true.
	 */
	exit?: string;
}

/** @experimental */
export interface GraphNodeV2 {
	id: string;
	/** The ONDC action (`search`, `on_search`, …); `decision` for a decision node. */
	api: string;
	owner: GraphOwnerV2;
	kind: GraphNodeKindV2;
	/** The request node this one answers; its message_id is reused. */
	responseFor?: string | null;
	description?: string;
	code?: GraphNodeCodeV2;
	/** The starting payload handed to `generate`; its `context` is overwritten. */
	defaultPayload?: unknown;
	/** The tester inputs the step asks for (a JSON Schema the host renders). */
	inputs?: { id?: string; jsonSchema?: unknown; sampleData?: unknown };
	/**
	 * What this step writes into session data once its payload exists, in v1's
	 * format: `key → JSONPath` (a match list), `APPEND#key` to accumulate,
	 * `EVAL#<base64 js>` for a `getSave(payload)` function.
	 */
	saveData?: Record<string, string>;
	/** A form node's HTML, base64. */
	formHtml?: string;
	/** A decision node's cases: one out wire each. */
	cases?: string[];
	/** Skipping it is not a deviation: the host may `skip` it instead of running it. */
	optional?: boolean;
	/** Needs an explicit trigger; never auto-selected. */
	manual?: boolean;
	/**
	 * How many times the node may run in one session; `resetOn` zeroes the
	 * count when that node runs. `until`: the node runs again, right after
	 * itself, until its `code.exit` returns true; reaching `max` first fails
	 * the run (`NextV2.failed`).
	 */
	repeat?: { max: number | "unbounded"; resetOn?: string; until?: boolean };
	/**
	 * A run may start here. When any node is marked, the entries are exactly
	 * the marked nodes; otherwise every node nothing main-path points at.
	 */
	start?: boolean;
	/** A transaction may finish here, even though wires lead on (`NextV2.canEnd`). */
	end?: boolean;
}

/** @experimental */
export interface GraphEdgeV2 {
	id: string;
	from: string;
	to: string;
	kind: GraphEdgeKindV2;
	/** Out of a decision node: the case this wire is taken on. */
	case?: string;
	/** The human name of an alternative ("out of stock"). */
	label?: string;
}

/** @experimental */
export interface ProtocolGraphV2 {
	nodes: GraphNodeV2[];
	edges: GraphEdgeV2[];
}

/**
 * How one mock run walks the protocol: where it starts, which alternative it
 * takes at each fork (keyed by the forking node's id) and which case it expects
 * each decision to return (preview only — the executor runs `decide`).
 *
 * @experimental
 */
export interface JourneyV2 {
	id: string;
	title?: string;
	entry: string;
	choices: Record<string, string>;
	expects: Record<string, string>;
	onDemand: string[];
	/** Optional nodes this journey skips (the host calls `skip` when `next` offers one). */
	skips?: string[];
	/** The node the journey finishes at; absent = runs until no wire leads on. */
	exit?: string;
}

/** @experimental */
export type GraphSessionModeV2 = "journey" | "open";

/**
 * One step that ran. In the simulator both actors are mocked, so every event
 * is `out`; the field is kept for the mock service, which also records what
 * it received.
 *
 * @experimental
 */
export interface GraphEventV2 {
	/** `${nodeId}::${messageId}::${ts}` — unique within a session. */
	id: string;
	nodeId: string;
	api: string;
	kind: GraphNodeKindV2;
	direction: "out" | "in";
	/** The payload produced (or received); a form's submission; `{ case }` for a decision. */
	payload: unknown;
	messageId: string;
	/** ISO timestamp. */
	ts: string;
	/** A decision event: the case `decide` returned. */
	case?: string;
	/** A `repeat.until` node: what its `exit` returned (false = it runs again). */
	exitMet?: boolean;
	/** The tester inputs the step ran with, if any. */
	inputs?: unknown;
	/** The session keys this step wrote, with their values after the write (APPENDs already concatenated). */
	saved: Record<string, unknown>;
	/** An on-demand / re-triggered run: not on the main path, so `next` ignores it. */
	extra?: boolean;
	/** `SKIPPED`: an optional node the host passed over; it produced nothing and saved nothing. */
	status: "SUCCESS" | "ERROR" | "SKIPPED";
}

/**
 * A run of the graph. Append-only: `events` is the truth, session data is
 * rebuilt from it (`rebuildSessionDataV2`). Immutable from the host's view —
 * every executor call returns a new session.
 *
 * @experimental
 */
export interface GraphSessionV2 {
	/** The same across every payload of the run: `context.transaction_id`. */
	transactionId: string;
	mode: GraphSessionModeV2;
	journeyId?: string;
	events: GraphEventV2[];
	/** Open mode: the alternative chosen at each fork (fork key → target node id). */
	decisions: Record<string, string>;
	/** Main-path runs per node, for `repeat`. */
	counters: Record<string, number>;
}

/** @experimental */
export interface ForkV2 {
	/** The forking node's id (what `JourneyV2.choices` and `decisions` are keyed by). */
	key: string;
	nodeId: string;
	options: { edge: GraphEdgeV2; target: GraphNodeV2 }[];
}

/**
 * What can happen next. At most one `auto` node per call: the executor is
 * step-by-step, so hosts can show each step.
 *
 * @experimental
 */
export interface NextV2 {
	/** The one node the protocol goes to next, or null when it is a fork / the end. */
	auto: GraphNodeV2 | null;
	/** Several alternatives and nothing (journey, decisions) picks one. */
	fork: ForkV2 | null;
	/** On-demand nodes the tester may fire at this point. */
	onDemand: GraphNodeV2[];
	/** Nothing follows the last step. */
	end: boolean;
	/** Why there is no `auto` when it isn't a fork or the end (e.g. repeat exhausted). */
	reason?: string;
	/** The last step is marked `end`: the host may finish the run here, though wires lead on. */
	canEnd?: boolean;
	/** The run cannot go on correctly (a `repeat.until` node ran `max` times without exiting); `reason` says why. */
	failed?: boolean;
}

/** @experimental */
export interface StepRunV2 {
	nodeId: string;
	kind: GraphNodeKindV2;
	/** `meetsRequirements(sessionData)`, when it ran. */
	requirements?: ExecutionResult;
	/** `generate(defaultPayload, sessionData)`. */
	generate?: ExecutionResult;
	/** `validate(producedPayload, sessionData)`, when generate succeeded. */
	validate?: ExecutionResult;
	/** A decision's `decide(sessionData)`. */
	decide?: ExecutionResult;
	/** A `repeat.until` node's `exit(payload, sessionData)`, after saveData. */
	exit?: ExecutionResult;
	/** The session keys this step wrote. */
	saved: Record<string, unknown>;
	/** The event appended, when the step produced something. */
	event?: GraphEventV2;
	/** The step produced its payload (or case / submission); checks may still have failed. */
	ok: boolean;
	/** Why `ok` is false. */
	error?: string;
	/** An optional node passed over with `skip`: nothing ran. */
	skipped?: boolean;
}

/** One candidate's verdict in `recognise`. @experimental */
export interface RecogniseCheckV2 {
	nodeId: string;
	/** The payload's `context.action` is this node's API (or the payload names no action). */
	apiMatches: boolean;
	/** The node's `match`, when it has one and the API matched. */
	match?: ExecutionResult;
	/** The node accepts the payload: API matches and `match` (if any) returned true. */
	accepted: boolean;
}

/**
 * Which step an incoming payload is, among the steps the protocol permits
 * next. Exactly one accepted candidate is a recognition; none or several is
 * a problem the host decides about (reject the message, or ask).
 *
 * @experimental
 */
export interface RecogniseResultV2 {
	/** The one step the payload is, when exactly one candidate accepts it. */
	node: GraphNodeV2 | null;
	/** Every candidate that accepts the payload. */
	matched: GraphNodeV2[];
	/** Every step the protocol permits here: the next step(s), the optional ones it may pass over, the on-demand ones. */
	candidates: GraphNodeV2[];
	/** Optional nodes passed over to reach `node` (the host `skip`s them before `receive`). */
	skipped: string[];
	checks: RecogniseCheckV2[];
	/** Why `node` is null: nothing accepted, or several did. */
	reason?: "none" | "ambiguous" | "end";
}

/** @experimental */
export interface GraphExecutorOptionsV2 {
	domain: string;
	version: string;
	transactionData: TransactionData;
	/** The shared helpers, base64 JavaScript; prepended to `generate` only, as in v1. */
	helperLib?: string;
	/** Merged into session data after the saved keys (v1's `external_session_data`). */
	externalSessionData?: Record<string, unknown>;
}

/** @experimental */
export interface RunStepOptionsV2 {
	/** Tester inputs for this step: become `sessionData.user_inputs`. */
	inputs?: unknown;
	/** A form node's submission. */
	formData?: unknown;
	/** Skip `meetsRequirements` (a retry after it said no). */
	skipRequirements?: boolean;
	/** An on-demand / re-triggered run: recorded, but not a main-path step. */
	extra?: boolean;
}
