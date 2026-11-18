import type { GraphExecutorV2 } from "./executor";
import type {
	ForkV2,
	GraphNodeV2,
	GraphOwnerV2,
	GraphSessionV2,
	JourneyV2,
	RecogniseResultV2,
	RunFailureCauseV2,
	StepRunV2,
} from "./types";

/**
 * The run driver: what to do next on a graph run, and doing it. The one place
 * the rules of a run live — journey skips, pending inputs / forms, waiting for
 * the counterparty, a decision deviating from its journey, a repeat-until
 * failure — so the Studio simulation and the mock service behave the same.
 * Pure over a JSON-serialisable state; the host only adds I/O (React state,
 * Redis, HTTP).
 */

/**
 * Which side the host generates payloads for. The simulation plays `both`;
 * a mock session plays the side opposite the network participant under test,
 * and waits for the participant's payloads on the other side's nodes.
 *
 * @experimental
 */
export type PlaysV2 = "both" | GraphOwnerV2;

/**
 * A journey said a decision would decide one way and `decide` went the other:
 * the journey can't be reached with this session data. The run stops.
 *
 * @experimental
 */
export interface RunDeviationV2 {
	nodeId: string;
	expected: string;
	actual: string;
}

/**
 * The run can't go on correctly: a repeat-until node never met its exit, a
 * decision looped past a repeat limit, … `cause` says which rule it was;
 * absent on a state stored before causes existed.
 *
 * @experimental
 */
export interface RunFailureV2 {
	nodeId: string;
	reason: string;
	cause?: RunFailureCauseV2;
}

/**
 * One run of a graph, as a host stores it. `session` is the executor's truth;
 * `runs` are the step results in order (checks, logs), `recognitions` keyed by
 * run index.
 *
 * @experimental
 */
export interface GraphRunStateV2 {
	session: GraphSessionV2;
	runs: StepRunV2[];
	recognitions: Record<number, RecogniseResultV2>;
	deviation: RunDeviationV2 | null;
	failure: RunFailureV2 | null;
	finished: boolean;
}

/**
 * What the run does next.
 * - `run`: the host generates this node now (or decides, for a decision).
 * - `skip`: the journey passes over this optional node.
 * - `inputs` / `form`: the node waits for tester inputs / a form submission.
 * - `await`: the counterparty's node — wait for its payload (`receiveV2`).
 * - `fork`: alternatives nothing picks (open mode).
 * - `end`: nothing follows; `failed`: the run can't go on (`cause` says which
 *   rule); `stopped`: the run already finished, deviated or failed.
 *
 * @experimental
 */
export type GraphPlanV2 =
	| { kind: "run"; node: GraphNodeV2 }
	| { kind: "skip"; node: GraphNodeV2 }
	| { kind: "inputs"; node: GraphNodeV2; schema: unknown; extra?: boolean }
	| { kind: "form"; node: GraphNodeV2 }
	| { kind: "await"; node: GraphNodeV2; candidates: GraphNodeV2[] }
	| { kind: "fork"; fork: ForkV2 }
	| { kind: "end"; canEnd: boolean; reason?: string }
	| {
			kind: "failed";
			nodeId: string;
			reason: string;
			cause?: RunFailureCauseV2;
	  }
	| { kind: "stopped"; reason: "finished" | "deviation" | "failure" };

/** @experimental */
export interface DriverLogV2 {
	level: "info" | "success" | "warn" | "error";
	message: string;
}

/** @experimental */
export type StepOutcomeV2 = "ran" | "pending" | "end" | "failed";

/** @experimental */
export interface DriverStepV2 {
	state: GraphRunStateV2;
	/** What the step found; after a `run`, what was run. */
	plan: GraphPlanV2;
	outcome: StepOutcomeV2;
	/** The step result appended to `state.runs`, if any. */
	run?: StepRunV2;
	logs: DriverLogV2[];
}

/** @experimental */
export interface DriverOptionsV2 {
	plays?: PlaysV2;
	/**
	 * Replay `recognise` on every generated payload: would it be recognised as
	 * this step had it arrived from a counterparty? Default: when playing both.
	 */
	recognise?: boolean;
}

/** A node whose step asks the tester for inputs before it runs. @experimental */
export const hasInputsV2 = (node: GraphNodeV2): boolean => {
	const schema = node.inputs?.jsonSchema;
	return (
		!!schema &&
		typeof schema === "object" &&
		Object.keys(schema as object).length > 0
	);
};

/** Whether the host generates `node` (decisions always: they are decided, not sent). @experimental */
export const hostPlaysV2 = (node: GraphNodeV2, plays: PlaysV2 = "both") =>
	plays === "both" || node.kind === "decision" || node.owner === plays;

/** A fresh run on `executor`. @experimental */
export const createGraphRunV2 = (
	executor: GraphExecutorV2,
	{
		transactionId,
		journey,
	}: { transactionId?: string; journey?: JourneyV2 | null },
): GraphRunStateV2 => ({
	session: executor.createSession({
		...(transactionId ? { transactionId } : {}),
		mode: journey ? "journey" : "open",
		...(journey ? { journeyId: journey.id } : {}),
	}),
	runs: [],
	recognitions: {},
	deviation: null,
	failure: null,
	finished: false,
});

const lastMainNodeId = (state: GraphRunStateV2) =>
	state.session.events.filter((e) => !e.extra).at(-1)?.nodeId ?? "";

/** What the run does next, without doing it. @experimental */
export const planV2 = (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
	plays: PlaysV2 = "both",
): GraphPlanV2 => {
	if (state.finished) return { kind: "stopped", reason: "finished" };
	if (state.deviation) return { kind: "stopped", reason: "deviation" };
	if (state.failure) return { kind: "stopped", reason: "failure" };
	const next = executor.next(state.session, journey);
	if (next.failed) {
		return {
			kind: "failed",
			nodeId: lastMainNodeId(state),
			reason: next.reason ?? "The run cannot go on",
			...(next.cause ? { cause: next.cause } : {}),
		};
	}
	if (next.fork) return { kind: "fork", fork: next.fork };
	const node = next.auto;
	if (!node)
		return {
			kind: "end",
			canEnd: !!next.canEnd || next.end,
			...(next.reason ? { reason: next.reason } : {}),
		};
	// A preset journey passes over the optional nodes it marked as skipped.
	if (node.optional && journey?.skips?.includes(node.id))
		return { kind: "skip", node };
	if (node.kind === "form") return { kind: "form", node };
	if (!hostPlaysV2(node, plays)) {
		return {
			kind: "await",
			node,
			candidates: executor
				.getCandidates(state.session, journey)
				.map((c) => c.node),
		};
	}
	if (node.kind !== "decision" && hasInputsV2(node))
		return { kind: "inputs", node, schema: node.inputs?.jsonSchema };
	return { kind: "run", node };
};

const withRun = (
	state: GraphRunStateV2,
	session: GraphSessionV2,
	run: StepRunV2,
	recognition?: RecogniseResultV2,
): GraphRunStateV2 => {
	const runs = [...state.runs, run];
	return {
		...state,
		session,
		runs,
		recognitions: recognition
			? { ...state.recognitions, [runs.length - 1]: recognition }
			: state.recognitions,
	};
};

const describeRecognition = (nodeId: string, seen: RecogniseResultV2) =>
	`${nodeId}: its payload would ${
		seen.reason === "ambiguous"
			? `be ambiguous between ${seen.matched.map((n) => n.id).join(", ")}`
			: seen.reason === "none"
				? "be recognised as no step"
				: `be recognised as ${seen.node?.id ?? "nothing"}`
	} if it arrived from a real counterparty · check match`;

/**
 * Takes the next step: runs or skips the next node, or reports what it waits
 * for. `inputs` / `formData` answer a pending `inputs` / `form` plan.
 *
 * @experimental
 */
export const stepV2 = async (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
	{
		inputs,
		formData,
		...options
	}: DriverOptionsV2 & {
		inputs?: Record<string, unknown>;
		formData?: Record<string, unknown>;
	} = {},
): Promise<DriverStepV2> => {
	const plays = options.plays ?? "both";
	const logs: DriverLogV2[] = [];
	const plan = planV2(executor, state, journey, plays);
	const done = (
		outcome: StepOutcomeV2,
		next: GraphRunStateV2 = state,
		run?: StepRunV2,
	): DriverStepV2 => ({
		state: next,
		plan,
		outcome,
		...(run ? { run } : {}),
		logs,
	});

	switch (plan.kind) {
		case "stopped":
			return done(plan.reason === "finished" ? "end" : "failed");
		case "failed":
			logs.push({ level: "error", message: plan.reason });
			return done("failed", {
				...state,
				failure: {
					nodeId: plan.nodeId,
					reason: plan.reason,
					...(plan.cause ? { cause: plan.cause } : {}),
				},
			});
		case "fork":
			if (journey)
				logs.push({
					level: "warn",
					message: `${journey.id}: fork at ${plan.fork.nodeId} has no choice`,
				});
			return done("pending");
		case "end":
			if (plan.reason) logs.push({ level: "info", message: plan.reason });
			return done("end");
		case "await":
			return done("pending");
		case "skip": {
			const out = executor.skip(state.session, plan.node.id);
			if (!out.run.ok) {
				logs.push({
					level: "error",
					message: `${plan.node.id}: ${out.run.error ?? "could not skip"}`,
				});
				return done("failed");
			}
			logs.push({
				level: "info",
				message: `${plan.node.id}: skipped (optional, per journey)`,
			});
			return done("ran", withRun(state, out.session, out.run), out.run);
		}
		case "form":
			if (formData === undefined) return done("pending");
			break;
		case "inputs":
			if (inputs === undefined) return done("pending");
			break;
		case "run":
			break;
	}

	const node = plan.node;
	const out = await executor.runStep(state.session, node.id, {
		...(inputs !== undefined ? { inputs } : {}),
		...(formData !== undefined ? { formData } : {}),
	});
	let recognition: RecogniseResultV2 | undefined;
	const replay = options.recognise ?? plays === "both";
	if (
		replay &&
		out.run.ok &&
		node.kind !== "decision" &&
		node.kind !== "form" &&
		out.run.event
	) {
		recognition = await executor.recognise(
			state.session,
			out.run.event.payload,
			journey,
		);
		if (recognition.node?.id !== node.id)
			logs.push({
				level: "warn",
				message: describeRecognition(node.id, recognition),
			});
	}
	let next = withRun(state, out.session, out.run, recognition);

	if (out.run.ok && node.kind === "decision" && journey) {
		const expected = journey.expects[node.id];
		const actual = out.run.event?.case ?? "";
		if (expected !== undefined && expected !== actual) {
			next = { ...next, deviation: { nodeId: node.id, expected, actual } };
			logs.push({
				level: "error",
				message: `${node.id}: decided "${actual}" but journey "${journey.id}" expects "${expected}" · the journey can't be reached with this session data`,
			});
			return done("failed", next, out.run);
		}
	}
	if (!out.run.ok) {
		logs.push({
			level: "error",
			message: `${node.id}: ${out.run.error ?? "failed"}`,
		});
		// A decision that can't be followed stops the run: stepping again would
		// decide the same way on the same session data, and a host that only
		// watches `failure` (the mock, the live page) would never hear of it.
		// `no-wire` when decide returned a case nothing is wired for; no cause
		// when decide itself failed to run.
		if (node.kind === "decision") {
			next = {
				...next,
				failure: {
					nodeId: node.id,
					reason: out.run.error ?? "decide failed",
					...(out.run.decide?.success ? { cause: "no-wire" as const } : {}),
				},
			};
		}
		return done("failed", next, out.run);
	}
	const checks = [
		out.run.requirements &&
		!(out.run.requirements.result as { valid?: boolean })?.valid
			? "requirements failed"
			: null,
		out.run.validate && !(out.run.validate.result as { valid?: boolean })?.valid
			? "validate failed"
			: null,
	].filter(Boolean);
	const again =
		out.run.event?.exitMet === false
			? " · exit condition not met yet, runs again"
			: "";
	logs.push({
		level: checks.length ? "warn" : "success",
		message: `${node.id}: ${
			node.kind === "decision" ? `decided ${out.run.event?.case}` : "sent"
		}${checks.length ? ` · ${checks.join(", ")}` : ""}${again}`,
	});
	return done("ran", next, out.run);
};

/**
 * Steps until something is pending, the run ends or fails, `stop` says so
 * after a step that ran, or `limit` steps ran. Returns every step taken.
 *
 * @experimental
 */
export const runUntilV2 = async (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
	{
		limit = 200,
		stop,
		...options
	}: DriverOptionsV2 & {
		limit?: number;
		stop?: (step: DriverStepV2) => boolean;
	} = {},
): Promise<{
	state: GraphRunStateV2;
	steps: DriverStepV2[];
	limited: boolean;
}> => {
	const steps: DriverStepV2[] = [];
	let current = state;
	for (let i = 0; i < limit; i += 1) {
		const step = await stepV2(executor, current, journey, options);
		steps.push(step);
		current = step.state;
		if (step.outcome !== "ran" || stop?.(step))
			return { state: current, steps, limited: false };
	}
	return { state: current, steps, limited: true };
};

/** Skips the next node, if it is optional (the tester's choice, not the journey's). @experimental */
export const skipNextV2 = (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
): { state: GraphRunStateV2; run?: StepRunV2; logs: DriverLogV2[] } => {
	const next = executor.next(state.session, journey);
	if (!next.auto) return { state, logs: [] };
	const out = executor.skip(state.session, next.auto.id);
	if (!out.run.ok)
		return {
			state,
			logs: [
				{
					level: "error",
					message: `${next.auto.id}: ${out.run.error ?? "could not skip"}`,
				},
			],
		};
	return {
		state: withRun(state, out.session, out.run),
		run: out.run,
		logs: [{ level: "info", message: `${next.auto.id}: skipped (optional)` }],
	};
};

/** Open mode: records the alternative taken at a fork. @experimental */
export const chooseV2 = (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	forkKey: string,
	targetId: string,
): GraphRunStateV2 => ({
	...state,
	session: executor.decide(state.session, forkKey, targetId),
});

/**
 * Runs an on-demand node without moving the main path. A node with inputs and
 * none given comes back as an `inputs` plan (submit to run it).
 *
 * @experimental
 */
export const triggerV2 = async (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	nodeId: string,
	inputs?: Record<string, unknown>,
): Promise<{
	state: GraphRunStateV2;
	pending?: GraphPlanV2;
	run?: StepRunV2;
	logs: DriverLogV2[];
}> => {
	const node = executor.getNode(nodeId);
	if (!node)
		return {
			state,
			logs: [
				{ level: "error", message: `Node "${nodeId}" is not on the graph` },
			],
		};
	if (inputs === undefined && hasInputsV2(node))
		return {
			state,
			pending: {
				kind: "inputs",
				node,
				schema: node.inputs?.jsonSchema,
				extra: true,
			},
			logs: [],
		};
	const out = await executor.runStep(state.session, nodeId, {
		extra: true,
		...(inputs !== undefined ? { inputs } : {}),
	});
	return {
		state: withRun(state, out.session, out.run),
		run: out.run,
		logs: [
			{
				level: out.run.ok ? "success" : "error",
				message: `${nodeId} (on demand): ${out.run.ok ? "sent" : out.run.error}`,
			},
		],
	};
};

/** Finishes the run at the End node it is at, though wires lead on. @experimental */
export const finishV2 = (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
): GraphRunStateV2 | null =>
	executor.next(state.session, journey).canEnd
		? { ...state, finished: true }
		: null;

/** @experimental */
export interface DriverReceiveV2 {
	state: GraphRunStateV2;
	recognition: RecogniseResultV2;
	/** The received step, when the payload was recognised and accepted. */
	run?: StepRunV2;
	/** Why the payload was not taken. */
	error?: string;
	logs: DriverLogV2[];
}

/**
 * A payload arrived from the counterparty: recognise which step it is, skip
 * the optional steps it passed over, then receive it (validate → saveData →
 * an `in` event). Refused when the run is stopped, nothing (or several steps)
 * accept it, or it is a step the host itself plays.
 *
 * @experimental
 */
export const receiveV2 = async (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
	payload: unknown,
	{ plays = "both" }: { plays?: PlaysV2 } = {},
): Promise<DriverReceiveV2> => {
	const logs: DriverLogV2[] = [];
	const recognition = await executor.recognise(state.session, payload, journey);
	const refuse = (error: string): DriverReceiveV2 => {
		logs.push({ level: "error", message: error });
		return { state, recognition, error, logs };
	};
	if (state.finished || state.deviation || state.failure)
		return refuse("The run has stopped: nothing more is received");
	const node = recognition.node;
	if (!node) {
		return refuse(
			recognition.reason === "ambiguous"
				? `The payload matches several steps: ${recognition.matched.map((n) => n.id).join(", ")}`
				: recognition.reason === "end"
					? "The run expects no further message"
					: "The payload is none of the steps expected here",
		);
	}
	if (plays !== "both" && hostPlaysV2(node, plays))
		return refuse(`"${node.id}" is sent by this side (${plays}), not received`);
	let current = state;
	for (const skipped of recognition.skipped) {
		const out = executor.skip(current.session, skipped);
		if (!out.run.ok)
			return refuse(out.run.error ?? `could not skip ${skipped}`);
		current = withRun(current, out.session, out.run);
		logs.push({ level: "info", message: `${skipped}: skipped (not sent)` });
	}
	const out = await executor.receive(current.session, node.id, payload);
	if (!out.run.ok)
		return refuse(`${node.id}: ${out.run.error ?? "not received"}`);
	current = withRun(current, out.session, out.run, recognition);
	const invalid =
		out.run.validate &&
		!(out.run.validate.result as { valid?: boolean } | undefined)?.valid;
	logs.push({
		level: invalid ? "warn" : "success",
		message: `${node.id}: received${invalid ? " · validate failed" : ""}`,
	});
	return { state: current, recognition, run: out.run, logs };
};

/** @experimental */
export type NodeRunStatusV2 =
	| "done"
	| "failed"
	| "skipped"
	| "running"
	| "awaiting";

/**
 * Per node, how the run stands: what ran (done / failed / skipped), and the
 * node about to run (`running`) or awaited from the counterparty (`awaiting`).
 *
 * @experimental
 */
export const getRunStatusV2 = (
	executor: GraphExecutorV2,
	state: GraphRunStateV2,
	journey: JourneyV2 | null | undefined,
	plays: PlaysV2 = "both",
): Record<string, NodeRunStatusV2> => {
	const status: Record<string, NodeRunStatusV2> = {};
	for (const r of state.runs)
		status[r.nodeId] = r.skipped ? "skipped" : r.ok ? "done" : "failed";
	if (state.deviation) status[state.deviation.nodeId] = "failed";
	if (state.failure) status[state.failure.nodeId] = "failed";
	if (state.deviation || state.failure || state.finished) return status;
	// The node about to run, even one that ran before (a repeat, a loop) — but not over a failure.
	const next = executor.next(state.session, journey).auto;
	if (next && status[next.id] !== "failed")
		status[next.id] =
			hostPlaysV2(next, plays) || next.kind === "form" ? "running" : "awaiting";
	return status;
};
