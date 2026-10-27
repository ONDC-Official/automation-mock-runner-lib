import { v4 as uuidv4 } from "uuid";

import { MockRunner } from "../lib/MockRunner";
import { getFunctionSchema } from "../lib/constants/function-registry";
import { createInitialMockConfig } from "../lib/configHelper";
import {
	buildContextV2,
	GraphExecutorV2,
	getSessionProvenanceV2,
	type GraphNodeV2,
	type GraphSessionV2,
	type JourneyV2,
	type ProtocolGraphV2,
} from "../lib/v2";

// Distinct ids per call, so message_id pairing is observable.
jest.mock("uuid", () => {
	let n = 0;
	return { v4: jest.fn(() => `uuid-${++n}`) };
});

const b64 = (src: string) => MockRunner.encodeBase64(src);
const template = (name: "generate" | "validate" | "meetsRequirements") => {
	const schema = getFunctionSchema(name);
	return b64(schema.template(schema.defaultBody));
};

const defaultSaveData = {
	transactionId: "$.context.transaction_id",
	latestMessage_id: "$.context.message_id",
	bapId: "$.context.bap_id",
	bppId: "$.context.bpp_id",
};

const apiNode = (
	id: string,
	api: string,
	patch: Partial<GraphNodeV2> = {},
): GraphNodeV2 => ({
	id,
	api,
	owner: api.startsWith("on_") ? "BPP" : "BAP",
	kind: api.startsWith("on_") ? "callback" : "request",
	responseFor: null,
	code: {
		generate: template("generate"),
		validate: template("validate"),
		requirements: template("meetsRequirements"),
	},
	defaultPayload: { context: {}, message: { from: id } },
	saveData: defaultSaveData,
	...patch,
});

const transactionData = {
	transaction_id: "tx-fixed",
	latest_timestamp: "2025-01-01T00:00:00.000Z",
	bap_id: "bap.example.com",
	bap_uri: "https://bap.example.com",
	bpp_id: "bpp.example.com",
	bpp_uri: "https://bpp.example.com",
	external_session_data: { mockBaseUrl: "https://mock" },
};

const options = {
	domain: "ONDC:TRV14",
	version: "2.0.0",
	transactionData,
	externalSessionData: transactionData.external_session_data,
};

const linear: ProtocolGraphV2 = {
	nodes: [
		apiNode("search", "search"),
		apiNode("on_search", "on_search", { responseFor: "search" }),
		apiNode("select", "select"),
		apiNode("on_select", "on_select", { responseFor: "select" }),
	],
	edges: [
		{ id: "e1", from: "search", to: "on_search", kind: "response" },
		{ id: "e2", from: "on_search", to: "select", kind: "next" },
		{ id: "e3", from: "select", to: "on_select", kind: "response" },
	],
};

const journey: JourneyV2 = {
	id: "happy",
	entry: "search",
	choices: {},
	expects: {},
	onDemand: [],
};

/** Runs `auto` steps until a fork / the end; returns the session and the runs. */
const runAll = async (
	executor: GraphExecutorV2,
	session: GraphSessionV2,
	j: JourneyV2 | null,
	limit = 20,
) => {
	const runs = [];
	for (let i = 0; i < limit; i += 1) {
		const next = executor.next(session, j);
		if (!next.auto) return { session, runs, next };
		const out = await executor.runStep(session, next.auto.id);
		runs.push(out.run);
		if (!out.run.ok) return { session: out.session, runs, next };
		session = out.session;
	}
	return { session, runs, next: executor.next(session, j) };
};

afterAll(() => GraphExecutorV2.terminateSharedRunner());

describe("GraphExecutorV2", () => {
	it("walks a linear journey with one transaction_id and paired message_ids", async () => {
		const executor = new GraphExecutorV2(linear, options);
		const session0 = executor.createSession({
			mode: "journey",
			journeyId: "happy",
		});
		expect(session0.transactionId).toBe("tx-fixed");

		const { session, runs, next } = await runAll(executor, session0, journey);
		expect(runs.map((r) => r.nodeId)).toEqual([
			"search",
			"on_search",
			"select",
			"on_select",
		]);
		expect(runs.every((r) => r.ok)).toBe(true);
		expect(next.end).toBe(true);

		const contexts = session.events.map((e) => (e.payload as any).context);
		expect(new Set(contexts.map((c) => c.transaction_id))).toEqual(
			new Set(["tx-fixed"]),
		);
		expect(contexts[1].message_id).toBe(contexts[0].message_id);
		expect(contexts[3].message_id).toBe(contexts[2].message_id);
		expect(contexts[2].message_id).not.toBe(contexts[0].message_id);
		expect(contexts[0]).not.toHaveProperty("bpp_id");
		expect(contexts[1].bpp_id).toBe("bpp.example.com");

		// Each run recorded the full pipeline and what it saved.
		expect(runs[0].requirements?.success).toBe(true);
		expect(runs[0].validate?.success).toBe(true);
		expect(runs[0].saved).toEqual({
			transactionId: ["tx-fixed"],
			latestMessage_id: [contexts[0].message_id],
			bapId: ["bap.example.com"],
			// search has no bpp_id: an empty match list, as v1 stores it.
			bppId: [],
		});

		const data = executor.getSessionData(session);
		expect(data.transactionId).toEqual(["tx-fixed"]);
		expect(data.latestMessage_id).toEqual([contexts[3].message_id]);
		expect(data.mockBaseUrl).toBe("https://mock");
		expect(data.bapUri).toBe("https://bap.example.com");
		expect(data.transaction_id).toBe("tx-fixed");
		expect(getSessionProvenanceV2(session).latestMessage_id).toBe("on_select");
	});

	it("builds the same context as MockRunner.generateContext", () => {
		const config = createInitialMockConfig("ONDC:TRV14", "2.0.0", "flow");
		config.transaction_data = transactionData;
		const runner = new MockRunner(config);
		const step = runner.getDefaultStep("on_select", "on_select");
		step.responseFor = "select";
		config.steps = [step];
		const sessionData = {
			latestMessage_id: ["m-select"],
			transaction_id: "tx-fixed",
			bapId: ["bap-from-session"],
			city_code: ["std:080"],
		};
		const expected = runner.generateContext(
			"on_select",
			"on_select",
			sessionData,
		);
		const actual = buildContextV2({
			domain: "ONDC:TRV14",
			version: "2.0.0",
			action: "on_select",
			transactionId: "tx-fixed",
			messageId: "m-select",
			sessionData,
			transactionData,
			timestamp: expected.timestamp,
		});
		expect(actual).toEqual(expected);

		const v1 = runner.generateContext("on_select", "on_select", sessionData);
		(config.meta as any).version = "1.2.0";
		const expected1 = new MockRunner(config).generateContext(
			"on_select",
			"on_select",
			sessionData,
		);
		const actual1 = buildContextV2({
			domain: "ONDC:TRV14",
			version: "1.2.0",
			action: "on_select",
			transactionId: "tx-fixed",
			messageId: "m-select",
			sessionData,
			transactionData,
			timestamp: expected1.timestamp,
		});
		expect(actual1).toEqual(expected1);
		expect(actual1).toHaveProperty("core_version", "1.2.0");
		expect(v1).toHaveProperty("version", "2.0.0");
	});

	it("stops at a fork in open mode and follows the decision once made", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("select", "select"),
				apiNode("on_select", "on_select", { responseFor: "select" }),
				apiNode("on_select_oos", "on_select", { responseFor: "select" }),
			],
			edges: [
				{
					id: "a",
					from: "select",
					to: "on_select",
					kind: "response",
					label: "in stock",
				},
				{
					id: "b",
					from: "select",
					to: "on_select_oos",
					kind: "response",
					label: "out of stock",
				},
			],
		};
		const executor = new GraphExecutorV2(graph, options);
		let session = executor.createSession({ mode: "open" });
		const first = await runAll(executor, session, null);
		session = first.session;
		expect(first.runs.map((r) => r.nodeId)).toEqual(["select"]);
		expect(first.next.fork).toMatchObject({ key: "select" });
		expect(first.next.fork?.options.map((o) => o.edge.label)).toEqual([
			"in stock",
			"out of stock",
		]);

		session = executor.decide(session, "select", "on_select_oos");
		const second = await runAll(executor, session, null);
		expect(second.runs.map((r) => r.nodeId)).toEqual(["on_select_oos"]);
		expect(second.next.end).toBe(true);

		// A preset journey resolves the same fork without asking.
		const preset = {
			...journey,
			entry: "select",
			choices: { select: "on_select" },
		};
		const third = await runAll(
			executor,
			executor.createSession({ mode: "journey" }),
			preset,
		);
		expect(third.runs.map((r) => r.nodeId)).toEqual(["select", "on_select"]);
	});

	it("runs a decision's decide and follows its case", async () => {
		const decide = b64(
			`function decide(sessionData) { return sessionData.bapId && sessionData.bapId[0] === "bap.example.com" ? "known" : "unknown"; }`,
		);
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				{
					id: "who",
					api: "decision",
					owner: "BPP",
					kind: "decision",
					cases: ["known", "unknown"],
					code: { decide },
				},
				apiNode("on_search_known", "on_search", { responseFor: "search" }),
				apiNode("on_search_unknown", "on_search", { responseFor: "search" }),
			],
			edges: [
				{ id: "a", from: "search", to: "who", kind: "next" },
				{
					id: "b",
					from: "who",
					to: "on_search_known",
					kind: "branch",
					case: "known",
				},
				{
					id: "c",
					from: "who",
					to: "on_search_unknown",
					kind: "branch",
					case: "unknown",
				},
			],
		};
		const executor = new GraphExecutorV2(graph, options);
		const { runs, session, next } = await runAll(
			executor,
			executor.createSession({ mode: "journey" }),
			{ ...journey, entry: "search" },
		);
		expect(runs.map((r) => r.nodeId)).toEqual([
			"search",
			"who",
			"on_search_known",
		]);
		expect(runs[1].kind).toBe("decision");
		expect(session.events[1].case).toBe("known");
		expect(next.end).toBe(true);
		// The callback after a decision still pairs with its request.
		const ctx = session.events.map((e) => (e.payload as any).context);
		expect(ctx[2].message_id).toBe(ctx[0].message_id);
	});

	it("reports a decision that returns an unknown case", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				{
					id: "sw",
					api: "decision",
					owner: "BPP",
					kind: "decision",
					cases: ["a"],
					code: { decide: b64(`function decide(s) { return "zzz"; }`) },
				},
				apiNode("x", "search"),
			],
			edges: [{ id: "e", from: "sw", to: "x", kind: "branch", case: "a" }],
		};
		const executor = new GraphExecutorV2(graph, options);
		const session = executor.createSession({ mode: "open" });
		const { run } = await executor.runStep(session, "sw");
		expect(run.ok).toBe(false);
		expect(run.error).toMatch(/expected one of a/);
	});

	it("honours repeat.max, resetOn and on-demand nodes", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("confirm", "confirm"),
				apiNode("on_status", "on_status", {
					kind: "unsolicited",
					repeat: { max: 2 },
				}),
				apiNode("status", "status", {
					kind: "on_demand",
					repeat: { max: 1, resetOn: "confirm" },
				}),
			],
			edges: [
				{ id: "a", from: "confirm", to: "on_status", kind: "next" },
				{ id: "b", from: "on_status", to: "on_status", kind: "next" },
			],
		};
		const executor = new GraphExecutorV2(graph, options);
		let session = executor.createSession({ mode: "open" });
		const walk = await runAll(executor, session, null);
		session = walk.session;
		expect(walk.runs.map((r) => r.nodeId)).toEqual([
			"confirm",
			"on_status",
			"on_status",
		]);
		expect(walk.next.end).toBe(true);
		expect(walk.next.reason).toMatch(/repeat limit/);
		expect(walk.next.onDemand.map((n) => n.id)).toEqual(["status"]);

		const extra = await executor.runStep(session, "status");
		expect(extra.run.ok).toBe(true);
		expect(extra.session.events.at(-1)?.extra).toBe(true);
		// Not a main-path step: next is unchanged. On-demand runs don't count
		// towards repeat (they are re-triggerable), so status stays offered.
		expect(executor.next(extra.session, null).end).toBe(true);
		expect(
			executor.next(extra.session, null).onDemand.map((n) => n.id),
		).toEqual(["status"]);
	});

	it("skips an optional node and refuses to skip a mandatory one or a decision", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				apiNode("on_search", "on_search", {
					responseFor: "search",
					optional: true,
				}),
				apiNode("select", "select"),
			],
			edges: [
				{ id: "a", from: "search", to: "on_search", kind: "response" },
				{ id: "b", from: "on_search", to: "select", kind: "next" },
			],
		};
		const executor = new GraphExecutorV2(graph, options);
		let session = executor.createSession({ mode: "open" });
		session = (await executor.runStep(session, "search")).session;
		expect(executor.next(session, null).auto?.id).toBe("on_search");

		const refused = executor.skip(session, "search");
		expect(refused.run.ok).toBe(false);
		expect(refused.run.error).toMatch(/not optional/);
		expect(refused.session).toBe(session);

		const skipped = executor.skip(session, "on_search");
		expect(skipped.run.ok).toBe(true);
		expect(skipped.run.skipped).toBe(true);
		expect(skipped.run.event?.status).toBe("SKIPPED");
		expect(skipped.run.event?.payload).toBeNull();
		session = skipped.session;
		expect(session.counters.on_search).toBe(1);
		// The path moves on; nothing was saved by the skip.
		expect(executor.next(session, null).auto?.id).toBe("select");
		expect(Object.keys(skipped.run.saved)).toEqual([]);
		expect(executor.getSessionData(session).transactionId).toEqual([
			"tx-fixed",
		]);

		const sw: GraphNodeV2 = {
			id: "sw",
			api: "decision",
			owner: "BAP",
			kind: "decision",
			optional: true,
			cases: ["yes"],
		};
		const withDecision = new GraphExecutorV2(
			{ nodes: [...graph.nodes, sw], edges: graph.edges },
			options,
		);
		expect(withDecision.skip(session, "sw").run.error).toMatch(
			/cannot be skipped/,
		);
	});

	it("recognises an incoming payload among alternatives, looking past optional steps", async () => {
		// `code` replaces apiNode's default code, so the templates are kept explicitly.
		const matchTag = (tag: string) => ({
			generate: template("generate"),
			validate: template("validate"),
			requirements: template("meetsRequirements"),
			match: b64(
				`function match(payload, sessionData) { return payload.message && payload.message.tag === ${JSON.stringify(tag)}; }`,
			),
		});
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				apiNode("on_search", "on_search", {
					responseFor: "search",
					optional: true,
				}),
				apiNode("select_a", "select", { code: matchTag("a") }),
				apiNode("select_b", "select", { code: matchTag("b") }),
				apiNode("select_c", "select"),
				apiNode("status", "status", { kind: "on_demand" }),
			],
			edges: [
				{ id: "r", from: "search", to: "on_search", kind: "response" },
				{
					id: "a",
					from: "on_search",
					to: "select_a",
					kind: "next",
					label: "A",
				},
				{
					id: "b",
					from: "on_search",
					to: "select_b",
					kind: "next",
					label: "B",
				},
				{
					id: "c",
					from: "on_search",
					to: "select_c",
					kind: "next",
					label: "C",
				},
			],
		};
		const executor = new GraphExecutorV2(graph, options);
		let session = executor.createSession({ mode: "open" });
		session = (await executor.runStep(session, "search")).session;

		// After search: on_search is next, but it is optional, so the selects
		// behind it (and the on-demand status) are possible too.
		expect(
			executor.getCandidates(session, null).map((c) => [c.node.id, c.skipped]),
		).toEqual([
			["on_search", []],
			["select_a", ["on_search"]],
			["select_b", ["on_search"]],
			["select_c", ["on_search"]],
			["status", []],
		]);

		const selectB = {
			context: { action: "select", message_id: "m-b" },
			message: { tag: "b" },
		};
		// select_c has no match, so it accepts any select: ambiguous with select_b.
		const ambiguous = await executor.recognise(session, selectB);
		expect(ambiguous.node).toBeNull();
		expect(ambiguous.reason).toBe("ambiguous");
		expect(ambiguous.matched.map((n) => n.id)).toEqual([
			"select_b",
			"select_c",
		]);
		expect(
			ambiguous.checks.find((c) => c.nodeId === "on_search")?.apiMatches,
		).toBe(false);
		expect(
			ambiguous.checks.find((c) => c.nodeId === "select_a")?.accepted,
		).toBe(false);

		const strict = new GraphExecutorV2(
			{
				nodes: graph.nodes.filter((n) => n.id !== "select_c"),
				edges: graph.edges.filter((e) => e.id !== "c"),
			},
			options,
		);
		const found = await strict.recognise(session, selectB);
		expect(found.node?.id).toBe("select_b");
		expect(found.skipped).toEqual(["on_search"]);

		const unknown = await strict.recognise(session, {
			context: { action: "select" },
			message: { tag: "zzz" },
		});
		expect(unknown.node).toBeNull();
		expect(unknown.reason).toBe("none");

		// The host follows the recognition: skip what was passed over, then receive.
		for (const id of found.skipped) session = strict.skip(session, id).session;
		const received = await strict.receive(session, "select_b", selectB);
		expect(received.run.ok).toBe(true);
		expect(received.run.event?.direction).toBe("in");
		expect(received.run.event?.messageId).toBe("m-b");
		expect(received.run.validate?.success).toBe(true);
		expect(received.run.saved.latestMessage_id).toEqual(["m-b"]);
		session = received.session;
		expect(strict.next(session, null).end).toBe(true);

		// A payload of another API is refused outright.
		const wrong = await strict.receive(session, "select_a", {
			context: { action: "init" },
		});
		expect(wrong.run.ok).toBe(false);
		expect(wrong.run.error).toMatch(/is a "init"/);
	});

	it("records a form submission v1-style", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				{
					id: "kyc",
					api: "html_form",
					owner: "BPP",
					kind: "form",
					formHtml: b64("<form/>"),
				},
				apiNode("confirm", "confirm"),
			],
			edges: [{ id: "a", from: "kyc", to: "confirm", kind: "form" }],
		};
		const executor = new GraphExecutorV2(graph, options);
		const session = executor.createSession({ mode: "journey" });
		const missing = await executor.runStep(session, "kyc");
		expect(missing.run.ok).toBe(false);
		const { run, session: after } = await executor.runStep(session, "kyc", {
			formData: { name: "A" },
		});
		expect(run.ok).toBe(true);
		const data = executor.getSessionData(after);
		expect(data.formData).toEqual({ kyc: { name: "A" } });
		expect(typeof data.kyc).toBe("string");
		expect(executor.next(after, null).auto?.id).toBe("confirm");
	});

	it("passes inputs as sessionData.user_inputs and keeps generate failures off the session", async () => {
		const generate = b64(`async function generate(defaultPayload, sessionData) {
  if (!sessionData.user_inputs) throw new Error("no inputs");
  defaultPayload.message.city = sessionData.user_inputs.city;
  return defaultPayload;
}`);
		const graph: ProtocolGraphV2 = {
			nodes: [apiNode("search", "search", { code: { generate } })],
			edges: [],
		};
		const executor = new GraphExecutorV2(graph, options);
		const session = executor.createSession({ mode: "journey" });
		const bad = await executor.runStep(session, "search");
		expect(bad.run.ok).toBe(false);
		expect(bad.run.error).toMatch(/no inputs/);
		expect(bad.session.events).toHaveLength(0);
		const good = await executor.runStep(session, "search", {
			inputs: { city: "BLR" },
		});
		expect(good.run.ok).toBe(true);
		expect((good.run.event?.payload as any).message.city).toBe("BLR");
		expect(good.run.event?.inputs).toEqual({ city: "BLR" });
	});

	it("uses the mocked uuid module", () => {
		expect(uuidv4()).toMatch(/^uuid-\d+$/);
	});
});

describe("GraphExecutorV2: start / end marks and exit conditions", () => {
	// on_status cycles PENDING → IN_PROGRESS → COMPLETED, one per run.
	const statusGenerate =
		b64(`async function generate(defaultPayload, sessionData) {
	const seen = (sessionData.statuses || []).length;
	defaultPayload.message = { order: { status: ["PENDING", "IN_PROGRESS", "COMPLETED"][Math.min(seen, 2)] } };
	return defaultPayload;
}`);
	const exitWhenFinal = b64(`function exit(payload, sessionData) {
	return ["COMPLETED", "FAILED"].includes(payload.message.order.status);
}`);
	const onStatus = (patch: Partial<GraphNodeV2> = {}) =>
		apiNode("on_status", "on_status", {
			kind: "unsolicited",
			code: {
				generate: statusGenerate,
				exit: exitWhenFinal,
			},
			saveData: {
				...defaultSaveData,
				"APPEND#statuses": "$.message.order.status",
			},
			repeat: { max: 5, until: true },
			...patch,
		});
	const statusGraph = (status: GraphNodeV2): ProtocolGraphV2 => ({
		nodes: [apiNode("confirm", "confirm"), status, apiNode("rate", "rating")],
		edges: [
			{ id: "a", from: "confirm", to: "on_status", kind: "next" },
			{ id: "b", from: "on_status", to: "rate", kind: "next" },
		],
	});

	it("takes the start-marked nodes as entries when any is marked", () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				apiNode("init", "init"),
				apiNode("confirm", "confirm"),
			],
			edges: [],
		};
		const unmarked = new GraphExecutorV2(graph, options);
		const session = unmarked.createSession({ mode: "open" });
		expect(
			unmarked.next(session, null).fork?.options.map((o) => o.target.id),
		).toEqual(["search", "init", "confirm"]);

		const marked = new GraphExecutorV2(
			{
				...graph,
				nodes: graph.nodes.map((n) =>
					n.id === "init" ? { ...n, start: true } : n,
				),
			},
			options,
		);
		expect(marked.next(session, null).auto?.id).toBe("init");
	});

	it("repeats a repeat-until node until exit returns true, then moves on", async () => {
		const executor = new GraphExecutorV2(statusGraph(onStatus()), options);
		const walk = await runAll(
			executor,
			executor.createSession({ mode: "open" }),
			null,
		);
		expect(walk.runs.map((r) => r.nodeId)).toEqual([
			"confirm",
			"on_status",
			"on_status",
			"on_status",
			"rate",
		]);
		expect(walk.runs.slice(1, 4).map((r) => r.exit?.result)).toEqual([
			false,
			false,
			true,
		]);
		expect(walk.session.events.slice(1, 4).map((e) => e.exitMet)).toEqual([
			false,
			false,
			true,
		]);
		expect(walk.next.end).toBe(true);
		expect(walk.next.failed).toBeUndefined();
	});

	it("fails the run when the repeat limit comes before the exit condition", async () => {
		const executor = new GraphExecutorV2(
			statusGraph(onStatus({ repeat: { max: 2, until: true } })),
			options,
		);
		const walk = await runAll(
			executor,
			executor.createSession({ mode: "open" }),
			null,
		);
		expect(walk.runs.map((r) => r.nodeId)).toEqual([
			"confirm",
			"on_status",
			"on_status",
		]);
		expect(walk.next.end).toBe(true);
		expect(walk.next.failed).toBe(true);
		expect(walk.next.reason).toMatch(
			/exit condition of "on_status" was not met after 2 runs/,
		);
	});

	it("fails the step when exit is missing, throws or returns a non-boolean", async () => {
		const cases: [string | undefined, RegExp][] = [
			[undefined, /no exit function/],
			[
				b64(`function exit(payload, sessionData) { throw new Error("boom"); }`),
				/boom/,
			],
			[
				b64(`function exit(payload, sessionData) { return "yes"; }`),
				/expected true or false/,
			],
		];
		for (const [exit, error] of cases) {
			const executor = new GraphExecutorV2(
				statusGraph(onStatus({ code: { generate: statusGenerate, exit } })),
				options,
			);
			let session = executor.createSession({ mode: "open" });
			session = (await executor.runStep(session, "confirm")).session;
			const out = await executor.runStep(session, "on_status");
			expect(out.run.ok).toBe(false);
			expect(out.run.error).toMatch(error);
			expect(out.session).toBe(session);
		}
	});

	it("ignores the exit condition for a node without repeat.until", async () => {
		const executor = new GraphExecutorV2(
			statusGraph(onStatus({ repeat: undefined })),
			options,
		);
		const walk = await runAll(
			executor,
			executor.createSession({ mode: "open" }),
			null,
		);
		expect(walk.runs.map((r) => r.nodeId)).toEqual([
			"confirm",
			"on_status",
			"rate",
		]);
		expect(walk.runs[1].exit).toBeUndefined();
		expect(walk.session.events[1].exitMet).toBeUndefined();
	});

	it("recognises a repeated incoming payload as the repeating node", async () => {
		const executor = new GraphExecutorV2(statusGraph(onStatus()), options);
		let session = executor.createSession({ mode: "open" });
		session = (await executor.runStep(session, "confirm")).session;
		const payload = (status: string) => ({
			context: { action: "on_status", message_id: `m-${status}` },
			message: { order: { status } },
		});
		const first = await executor.receive(
			session,
			"on_status",
			payload("PENDING"),
		);
		expect(first.run.ok).toBe(true);
		expect(first.run.event?.exitMet).toBe(false);
		session = first.session;
		const found = await executor.recognise(session, payload("COMPLETED"));
		expect(found.node?.id).toBe("on_status");
		const second = await executor.receive(
			session,
			"on_status",
			payload("COMPLETED"),
		);
		expect(second.run.event?.exitMet).toBe(true);
		expect(executor.next(second.session, null).auto?.id).toBe("rate");
	});

	it("does not evaluate exit for a skipped optional node", async () => {
		const executor = new GraphExecutorV2(
			statusGraph(onStatus({ optional: true })),
			options,
		);
		let session = executor.createSession({ mode: "open" });
		session = (await executor.runStep(session, "confirm")).session;
		const skipped = executor.skip(session, "on_status");
		expect(skipped.run.ok).toBe(true);
		expect(skipped.run.exit).toBeUndefined();
		expect(executor.next(skipped.session, null).auto?.id).toBe("rate");
	});

	it("ends at the journey's exit and offers canEnd at an end-marked node", async () => {
		const graph: ProtocolGraphV2 = {
			...linear,
			nodes: linear.nodes.map((n) =>
				n.id === "on_search" ? { ...n, end: true } : n,
			),
		};
		const executor = new GraphExecutorV2(graph, options);
		const journey: JourneyV2 = {
			id: "browse",
			entry: "search",
			choices: {},
			expects: {},
			onDemand: [],
			exit: "on_search",
		};
		const walk = await runAll(
			executor,
			executor.createSession({ mode: "journey", journeyId: "browse" }),
			journey,
		);
		expect(walk.runs.map((r) => r.nodeId)).toEqual(["search", "on_search"]);
		expect(walk.next.end).toBe(true);

		// Without a journey exit the path goes on, but the host may finish here.
		const open = executor.next(walk.session, null);
		expect(open.auto?.id).toBe("select");
		expect(open.canEnd).toBe(true);
		const atSearch = executor.next(
			{ ...walk.session, events: walk.session.events.slice(0, 1) },
			null,
		);
		expect(atSearch.canEnd).toBe(false);
	});
});
