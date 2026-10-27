import { v4 as uuidv4 } from "uuid";

import { getFunctionSchema } from "../../constants/function-registry";
import { BaseCodeRunner } from "../../runners/base-runner";
import { RunnerFactory, RunnerOptions } from "../../runners/runner-factory";
import type { ExecutionResult } from "../../types/execution-results";
import * as base64 from "../../utils/base64";
import { Logger } from "../../utils/logger";
import { buildContextV2 } from "./context";
import { indexGraphV2, nextStepsV2, type GraphIndexV2 } from "./next";
import { applyFormEntryV2, applySaveDataV2 } from "./save-data";
import {
	createGraphSessionV2,
	getLatestEventV2,
	rebuildSessionDataV2,
	type CreateGraphSessionV2,
} from "./session";
import type {
	GraphEventV2,
	GraphExecutorOptionsV2,
	GraphNodeV2,
	GraphSessionV2,
	JourneyV2,
	NextV2,
	ProtocolGraphV2,
	RecogniseCheckV2,
	RecogniseResultV2,
	RunStepOptionsV2,
	StepRunV2,
} from "./types";

/** How many optional nodes in a row `recognise` looks past. */
const OPTIONAL_LOOKAHEAD = 10;

const actionOf = (payload: unknown): string | undefined => {
	const context = (payload as { context?: { action?: unknown } } | null)
		?.context;
	return typeof context?.action === "string" ? context.action : undefined;
};

const decodeOr = (encoded: string | undefined, fallback: string) => {
	if (!encoded) return fallback;
	try {
		return base64.decode(encoded);
	} catch {
		return fallback;
	}
};

const failed = (name: string, message: string): ExecutionResult => ({
	timestamp: new Date().toISOString(),
	success: false,
	error: { name, message },
	logs: [],
	executionTime: 0,
	validation: { isValid: false, errors: [message], warnings: [] },
});

/**
 * Runs a protocol graph step by step, in any environment: the host supplies
 * the graph and keeps the session; the executor never touches storage or
 * HTTP. Each step runs v1's pipeline in v1's sandbox — `meetsRequirements` →
 * `generate` (helpers prepended, `context` rebuilt) → `validate` → `saveData`
 * — and appends one event. A v1 config runs through `graphFromV1ConfigV2`.
 *
 * Sessions are immutable from the host's view: every call that changes one
 * returns a new session, so a host can keep history for "run to here" / reset.
 *
 * @experimental
 */
export class GraphExecutorV2 {
	private static sharedRunner: BaseCodeRunner | undefined;
	private readonly index: GraphIndexV2;
	private readonly logger: Logger;

	/** Replaces the shared sandbox (separate from `MockRunner`'s and `MockRunnerV2`'s pools). */
	public static initSharedRunner(options: RunnerOptions = {}): BaseCodeRunner {
		if (GraphExecutorV2.sharedRunner) {
			try {
				GraphExecutorV2.sharedRunner.terminate();
			} catch {
				// a dead runner is fine to drop
			}
		}
		GraphExecutorV2.sharedRunner = RunnerFactory.createRunner(options);
		return GraphExecutorV2.sharedRunner;
	}

	/** Stops the shared sandbox (tests, shutdown). The next run starts a new one. */
	public static terminateSharedRunner(): void {
		GraphExecutorV2.sharedRunner?.terminate();
		GraphExecutorV2.sharedRunner = undefined;
	}

	private static getSharedRunner(): BaseCodeRunner {
		if (!GraphExecutorV2.sharedRunner) {
			GraphExecutorV2.sharedRunner = RunnerFactory.createRunner({});
		}
		return GraphExecutorV2.sharedRunner;
	}

	constructor(
		public readonly graph: ProtocolGraphV2,
		public readonly options: GraphExecutorOptionsV2,
		private readonly runner: BaseCodeRunner = GraphExecutorV2.getSharedRunner(),
	) {
		this.index = indexGraphV2(graph);
		this.logger = Logger.getInstance();
	}

	public getNode(nodeId: string): GraphNodeV2 | undefined {
		return this.index.byId.get(nodeId);
	}

	public createSession(init: CreateGraphSessionV2): GraphSessionV2 {
		return createGraphSessionV2({
			transactionId: this.options.transactionData.transaction_id,
			...init,
		});
	}

	/** Session data as the next step's functions will see it. */
	public getSessionData(session: GraphSessionV2): Record<string, unknown> {
		return rebuildSessionDataV2(session, {
			transactionData: this.options.transactionData,
			external: this.options.externalSessionData,
		});
	}

	/** What follows the last main-path step. */
	public next(session: GraphSessionV2, journey?: JourneyV2 | null): NextV2 {
		return nextStepsV2(this.graph, session, journey, this.index);
	}

	/** Open mode: records the alternative taken at a fork. */
	public decide(
		session: GraphSessionV2,
		forkKey: string,
		targetNodeId: string,
	): GraphSessionV2 {
		return {
			...session,
			decisions: { ...session.decisions, [forkKey]: targetNodeId },
		};
	}

	/**
	 * Whether `node` accepts `payload`: its API is the payload's
	 * `context.action` (a payload naming no action is not filtered), and its
	 * `match`, when it has one, returns true. A `match` that fails to run
	 * rejects, with the error in the check.
	 */
	public async matchNode(
		node: GraphNodeV2,
		payload: unknown,
		sessionData: Record<string, unknown>,
	): Promise<RecogniseCheckV2> {
		const action = actionOf(payload);
		const apiMatches =
			node.kind !== "decision" && (action === undefined || action === node.api);
		if (!apiMatches) return { nodeId: node.id, apiMatches, accepted: false };
		const source = decodeOr(node.code?.match, "");
		if (!source) return { nodeId: node.id, apiMatches, accepted: true };
		const match = await this.execute("match", source, [payload, sessionData]);
		return {
			nodeId: node.id,
			apiMatches,
			match,
			accepted: match.success && match.result === true,
		};
	}

	/**
	 * Every step the protocol permits as the next incoming message: the next
	 * step (or, at a fork, each alternative), the steps after any optional
	 * ones it may pass over (with the skips needed to reach each), and the
	 * on-demand steps. Decisions never appear: they are decided, not received.
	 */
	public getCandidates(
		session: GraphSessionV2,
		journey?: JourneyV2 | null,
	): { node: GraphNodeV2; skipped: string[] }[] {
		const out: { node: GraphNodeV2; skipped: string[] }[] = [];
		const seen = new Set<string>();
		const push = (node: GraphNodeV2, skipped: string[]) => {
			if (seen.has(node.id)) return;
			seen.add(node.id);
			out.push({ node, skipped });
		};
		let current = session;
		const skipped: string[] = [];
		for (let i = 0; i <= OPTIONAL_LOOKAHEAD; i += 1) {
			const next = this.next(current, journey);
			if (next.fork) {
				for (const option of next.fork.options)
					push(option.target, [...skipped]);
				break;
			}
			if (!next.auto) break;
			if (next.auto.kind !== "decision") push(next.auto, [...skipped]);
			if (!next.auto.optional) break;
			// It may be passed over: what follows it is possible too.
			const out2 = this.skip(current, next.auto.id);
			if (!out2.run.ok) break;
			skipped.push(next.auto.id);
			current = out2.session;
		}
		for (const node of this.next(session, journey).onDemand) push(node, []);
		return out;
	}

	/**
	 * Which step an incoming payload is. Filters the candidates by the
	 * payload's `context.action`, then asks each remaining candidate's
	 * `match`. Exactly one acceptance is a recognition; none or several is
	 * reported for the host to decide (reject, or ask). Nothing is appended:
	 * the host follows with `skip` for each of `skipped`, then `receive`.
	 */
	public async recognise(
		session: GraphSessionV2,
		payload: unknown,
		journey?: JourneyV2 | null,
	): Promise<RecogniseResultV2> {
		const candidates = this.getCandidates(session, journey);
		if (candidates.length === 0) {
			return {
				node: null,
				matched: [],
				candidates: [],
				skipped: [],
				checks: [],
				reason: "end",
			};
		}
		const sessionData = this.getSessionData(session);
		const checks: RecogniseCheckV2[] = [];
		const matched: { node: GraphNodeV2; skipped: string[] }[] = [];
		for (const candidate of candidates) {
			const check = await this.matchNode(candidate.node, payload, sessionData);
			checks.push(check);
			if (check.accepted) matched.push(candidate);
		}
		const one = matched.length === 1 ? matched[0] : null;
		return {
			node: one?.node ?? null,
			matched: matched.map((m) => m.node),
			candidates: candidates.map((c) => c.node),
			skipped: one?.skipped ?? [],
			checks,
			...(one ? {} : { reason: matched.length === 0 ? "none" : "ambiguous" }),
		};
	}

	/**
	 * Records a payload received from the counterparty as `nodeId`'s step:
	 * `validate(payload, sessionData)` (recorded, not blocking), then `saveData`,
	 * then one `direction: "in"` event with the payload's own message_id. The
	 * mock-session counterpart of `runStep`; nothing is generated. A form
	 * node's submission goes through `runStep({ formData })` instead.
	 */
	public async receive(
		session: GraphSessionV2,
		nodeId: string,
		payload: unknown,
		{ extra }: { extra?: boolean } = {},
	): Promise<{ run: StepRunV2; session: GraphSessionV2 }> {
		const node = this.index.byId.get(nodeId);
		if (!node) {
			return {
				run: {
					nodeId,
					kind: "request",
					saved: {},
					ok: false,
					error: `Node "${nodeId}" is not on the graph`,
				},
				session,
			};
		}
		const run: StepRunV2 = { nodeId, kind: node.kind, saved: {}, ok: false };
		if (node.kind === "decision" || node.kind === "form") {
			run.error = `A ${node.kind} node is not received: ${
				node.kind === "decision"
					? "the protocol decides it"
					: "use runStep with formData"
			}`;
			return { run, session };
		}
		const action = actionOf(payload);
		if (action !== undefined && action !== node.api) {
			run.error = `Payload is a "${action}", not a "${node.api}"`;
			return { run, session };
		}
		const isExtra = extra ?? node.kind === "on_demand";
		const sessionData = this.getSessionData(session);
		const code = node.code ?? {};
		if (code.validate) {
			run.validate = await this.execute(
				"validate",
				decodeOr(code.validate, ""),
				[payload, sessionData],
			);
		}
		const into: Record<string, unknown> = { ...sessionData };
		try {
			const touched = await applySaveDataV2(
				node.saveData,
				payload,
				into,
				async (p, b64) =>
					(await this.execute("getSave", decodeOr(b64, ""), [p])).result,
				session.events.length,
			);
			for (const key of touched) run.saved[key] = into[key];
		} catch (e) {
			run.error = e instanceof Error ? e.message : String(e);
			return { run, session };
		}
		const exitMet = await this.checkExit(node, payload, into, run, isExtra);
		if (run.error) return { run, session };
		const context = (payload as { context?: Record<string, unknown> } | null)
			?.context;
		const messageId =
			typeof context?.message_id === "string" ? context.message_id : uuidv4();
		const event: GraphEventV2 = {
			...this.makeEvent(node, {
				payload,
				messageId,
				saved: run.saved,
				extra: isExtra,
				exitMet,
			}),
			direction: "in",
		};
		run.event = event;
		run.ok = true;
		return { run, session: this.append(session, node, event, isExtra) };
	}

	/**
	 * Passes over an optional node without running it: the main path moves on
	 * as if it had run, but nothing is produced or saved. Refused for a node
	 * that is not optional (skipping it would be a deviation) and for a decision
	 * (the protocol has to decide there).
	 */
	public skip(
		session: GraphSessionV2,
		nodeId: string,
	): { run: StepRunV2; session: GraphSessionV2 } {
		const node = this.index.byId.get(nodeId);
		const refuse = (error: string) => ({
			run: {
				nodeId,
				kind: node?.kind ?? ("request" as const),
				saved: {},
				ok: false,
				error,
			},
			session,
		});
		if (!node) return refuse(`Node "${nodeId}" is not on the graph`);
		if (node.kind === "decision")
			return refuse(
				`Decision "${nodeId}" cannot be skipped: the protocol decides there`,
			);
		if (!node.optional)
			return refuse(`"${nodeId}" is not optional: skipping it is a deviation`);
		const ts = new Date().toISOString();
		const event: GraphEventV2 = {
			id: `${node.id}::skipped::${ts}`,
			nodeId: node.id,
			api: node.api,
			kind: node.kind,
			direction: "out",
			payload: null,
			messageId: "",
			ts,
			saved: {},
			status: "SKIPPED",
		};
		const run: StepRunV2 = {
			nodeId: node.id,
			kind: node.kind,
			saved: {},
			event,
			ok: true,
			skipped: true,
		};
		return { run, session: this.append(session, node, event, false) };
	}

	/**
	 * Runs one node and appends its event. `ok` is false when nothing could be
	 * produced (generate failed, decide returned an unknown case, no form data);
	 * a failing `meetsRequirements` or `validate` is recorded, not blocking.
	 */
	public async runStep(
		session: GraphSessionV2,
		nodeId: string,
		{ inputs, formData, skipRequirements, extra }: RunStepOptionsV2 = {},
	): Promise<{ run: StepRunV2; session: GraphSessionV2 }> {
		const node = this.index.byId.get(nodeId);
		if (!node) {
			return {
				run: {
					nodeId,
					kind: "request",
					saved: {},
					ok: false,
					error: `Node "${nodeId}" is not on the graph`,
				},
				session,
			};
		}
		const isExtra = extra ?? node.kind === "on_demand";
		const sessionData = this.getSessionData(session);
		if (
			inputs !== undefined &&
			inputs !== null &&
			Object.keys(inputs as object).length > 0
		) {
			sessionData.user_inputs = inputs;
		}

		if (node.kind === "decision")
			return this.runDecision(session, node, sessionData, isExtra);
		if (node.kind === "form")
			return this.runForm(session, node, formData, isExtra);

		const run: StepRunV2 = { nodeId, kind: node.kind, saved: {}, ok: false };
		const code = node.code ?? {};

		if (!skipRequirements && code.requirements) {
			run.requirements = await this.execute(
				"meetsRequirements",
				decodeOr(code.requirements, ""),
				[sessionData],
			);
		}

		// generate: context rebuilt for this run, helpers prepended as in v1.
		const defaultPayload = JSON.parse(
			JSON.stringify(node.defaultPayload ?? {}),
		) as Record<string, unknown>;
		const messageId = this.messageIdFor(node, session, sessionData);
		defaultPayload.context = buildContextV2({
			domain: this.options.domain,
			version: this.options.version,
			action: node.api,
			transactionId: session.transactionId,
			messageId,
			sessionData,
			transactionData: this.options.transactionData,
		});
		const helpers = decodeOr(this.options.helperLib, "");
		const generateSource = decodeOr(code.generate, "");
		run.generate = generateSource
			? await this.execute("generate", `${helpers}\n${generateSource}`, [
					defaultPayload,
					sessionData,
				])
			: failed("MissingCode", "The node has no generate function");
		if (!run.generate.success) {
			run.error = run.generate.error?.message ?? "generate failed";
			return { run, session };
		}
		const payload = run.generate.result as Record<string, unknown>;

		if (code.validate) {
			run.validate = await this.execute(
				"validate",
				decodeOr(code.validate, ""),
				[payload, sessionData],
			);
		}

		// saveData onto the current session, so APPENDs concatenate; only this step's keys are kept.
		const into: Record<string, unknown> = { ...sessionData };
		try {
			const touched = await applySaveDataV2(
				node.saveData,
				payload,
				into,
				async (p, b64) =>
					(await this.execute("getSave", decodeOr(b64, ""), [p])).result,
				session.events.length,
			);
			for (const key of touched) run.saved[key] = into[key];
		} catch (e) {
			run.error = e instanceof Error ? e.message : String(e);
			return { run, session };
		}
		const exitMet = await this.checkExit(node, payload, into, run, isExtra);
		if (run.error) return { run, session };

		const producedMessageId =
			typeof (payload?.context as Record<string, unknown> | undefined)
				?.message_id === "string"
				? ((payload.context as Record<string, unknown>).message_id as string)
				: messageId;
		const event = this.makeEvent(node, {
			payload,
			messageId: producedMessageId,
			inputs,
			saved: run.saved,
			extra: isExtra,
			exitMet,
		});
		run.event = event;
		run.ok = true;
		return { run, session: this.append(session, node, event, isExtra) };
	}

	/**
	 * A `repeat.until` node's exit condition, run after saveData so it sees
	 * what this run saved. Returns whether it was met (undefined for any other
	 * node, and for on-demand / extra runs, which never move the path); sets
	 * `run.error` when `exit` is missing, throws or returns a non-boolean.
	 */
	private async checkExit(
		node: GraphNodeV2,
		payload: unknown,
		sessionData: Record<string, unknown>,
		run: StepRunV2,
		extra: boolean,
	): Promise<boolean | undefined> {
		if (!node.repeat?.until || extra) return undefined;
		const source = decodeOr(node.code?.exit, "");
		run.exit = source
			? await this.execute("exit", source, [payload, sessionData])
			: failed(
					"MissingCode",
					"The node repeats until exit, but has no exit function",
				);
		if (!run.exit.success) {
			run.error = run.exit.error?.message ?? "exit failed";
			return undefined;
		}
		if (typeof run.exit.result !== "boolean") {
			run.error = `exit returned ${JSON.stringify(run.exit.result)}; expected true or false`;
			return undefined;
		}
		return run.exit.result;
	}

	private async runDecision(
		session: GraphSessionV2,
		node: GraphNodeV2,
		sessionData: Record<string, unknown>,
		extra: boolean,
	): Promise<{ run: StepRunV2; session: GraphSessionV2 }> {
		const run: StepRunV2 = {
			nodeId: node.id,
			kind: "decision",
			saved: {},
			ok: false,
		};
		const source = decodeOr(node.code?.decide, "");
		run.decide = source
			? await this.execute("decide", source, [sessionData])
			: failed("MissingCode", "The decision has no decide function");
		if (!run.decide.success) {
			run.error = run.decide.error?.message ?? "decide failed";
			return { run, session };
		}
		const chosen = run.decide.result;
		const cases =
			node.cases ??
			(this.index.out.get(node.id) ?? [])
				.map((edge) => edge.case)
				.filter(Boolean);
		if (
			typeof chosen !== "string" ||
			(cases.length > 0 && !cases.includes(chosen))
		) {
			run.error = `decide returned ${JSON.stringify(chosen)}; expected one of ${cases.join(", ")}`;
			return { run, session };
		}
		const event = this.makeEvent(node, {
			payload: { case: chosen },
			messageId: "",
			saved: {},
			extra,
			decisionCase: chosen,
		});
		run.event = event;
		run.ok = true;
		return { run, session: this.append(session, node, event, extra) };
	}

	private runForm(
		session: GraphSessionV2,
		node: GraphNodeV2,
		formData: unknown,
		extra: boolean,
	): { run: StepRunV2; session: GraphSessionV2 } {
		const run: StepRunV2 = {
			nodeId: node.id,
			kind: "form",
			saved: {},
			ok: false,
		};
		if (formData === undefined) {
			run.error = "A form step needs its submission (formData)";
			return { run, session };
		}
		const into: Record<string, unknown> = {};
		const submissionId = uuidv4();
		for (const key of applyFormEntryV2(node.id, formData, into, submissionId)) {
			run.saved[key] = into[key];
		}
		const event = this.makeEvent(node, {
			payload: formData,
			messageId: submissionId,
			saved: run.saved,
			extra,
		});
		run.event = event;
		run.ok = true;
		return { run, session: this.append(session, node, event, extra) };
	}

	/**
	 * v1's rule: a callback reuses its request's message_id — from the session's
	 * `latestMessage_id` when set, else the request's own event; anything else
	 * gets a fresh id.
	 */
	private messageIdFor(
		node: GraphNodeV2,
		session: GraphSessionV2,
		sessionData: Record<string, unknown>,
	): string {
		if (!node.responseFor) return uuidv4();
		const latest = sessionData.latestMessage_id;
		if (
			Array.isArray(latest) &&
			latest.length > 0 &&
			typeof latest[0] === "string"
		) {
			return latest[0];
		}
		// A skipped request has no message_id to answer: a fresh one, as for any other step.
		return getLatestEventV2(session, node.responseFor)?.messageId || uuidv4();
	}

	private makeEvent(
		node: GraphNodeV2,
		{
			payload,
			messageId,
			inputs,
			saved,
			extra,
			decisionCase,
			exitMet,
		}: {
			payload: unknown;
			messageId: string;
			inputs?: unknown;
			saved: Record<string, unknown>;
			extra: boolean;
			decisionCase?: string;
			exitMet?: boolean;
		},
	): GraphEventV2 {
		const ts = new Date().toISOString();
		return {
			id: `${node.id}::${messageId}::${ts}`,
			nodeId: node.id,
			api: node.api,
			kind: node.kind,
			direction: "out",
			payload,
			messageId,
			ts,
			...(decisionCase !== undefined ? { case: decisionCase } : {}),
			...(exitMet !== undefined ? { exitMet } : {}),
			...(inputs !== undefined ? { inputs } : {}),
			saved,
			...(extra ? { extra: true } : {}),
			status: "SUCCESS",
		};
	}

	private append(
		session: GraphSessionV2,
		node: GraphNodeV2,
		event: GraphEventV2,
		extra: boolean,
	): GraphSessionV2 {
		const counters = { ...session.counters };
		if (!extra) counters[node.id] = (counters[node.id] ?? 0) + 1;
		// Running this node resets the count of every node whose repeat says so.
		for (const other of this.graph.nodes) {
			if (other.repeat?.resetOn === node.id) counters[other.id] = 0;
		}
		return { ...session, events: [...session.events, event], counters };
	}

	private async execute(
		name:
			| "generate"
			| "validate"
			| "meetsRequirements"
			| "getSave"
			| "decide"
			| "match"
			| "exit",
		code: string,
		args: unknown[],
	): Promise<ExecutionResult> {
		try {
			return await this.runner.execute(code, getFunctionSchema(name), args);
		} catch (error) {
			this.logger.error(`GraphExecutorV2: ${name} threw`, {}, error as Error);
			return failed(
				`${name[0].toUpperCase()}${name.slice(1)}Error`,
				(error as Error).message || "Unknown error",
			);
		}
	}
}
