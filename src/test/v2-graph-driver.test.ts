import { MockRunner } from "../lib/MockRunner";
import { getFunctionSchema } from "../lib/constants/function-registry";
import {
	createGraphRunV2,
	finishV2,
	getRunStatusV2,
	GraphExecutorV2,
	parseLiveGraphConfigV2,
	planV2,
	receiveV2,
	runUntilV2,
	settleV2,
	stepV2,
	triggerV2,
	type GraphNodeV2,
	type GraphRunStateV2,
	type JourneyV2,
	type ProtocolGraphV2,
} from "../lib/v2";

jest.mock("uuid", () => {
	let n = 0;
	return { v4: jest.fn(() => `uuid-${++n}`) };
});

const b64 = (src: string) => MockRunner.encodeBase64(src);
const template = (name: "generate" | "validate" | "meetsRequirements") => {
	const schema = getFunctionSchema(name);
	return b64(schema.template(schema.defaultBody));
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
	saveData: {
		transactionId: "$.context.transaction_id",
		latestMessage_id: "$.context.message_id",
		bapId: "$.context.bap_id",
	},
	...patch,
});

const transactionData = {
	transaction_id: "tx-fixed",
	latest_timestamp: "2025-01-01T00:00:00.000Z",
	bap_id: "bap.example.com",
	bap_uri: "https://bap.example.com",
	bpp_id: "bpp.example.com",
	bpp_uri: "https://bpp.example.com",
};

const options = { domain: "ONDC:TRV14", version: "2.0.0", transactionData };

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

const happy: JourneyV2 = {
	id: "happy",
	entry: "search",
	choices: {},
	expects: {},
	onDemand: [],
};

/** A payload as the counterparty would send it. */
const incoming = (action: string, messageId: string, extra = {}) => ({
	context: {
		action,
		message_id: messageId,
		transaction_id: "tx-fixed",
		bap_id: "bap.example.com",
	},
	message: { from: "np", ...extra },
});

afterAll(() => GraphExecutorV2.terminateSharedRunner());

describe("graph run driver", () => {
	it("plays both sides to the end, as the Studio simulation does", async () => {
		const executor = new GraphExecutorV2(linear, options);
		const state = createGraphRunV2(executor, { journey: happy });
		const out = await runUntilV2(executor, state, happy);
		expect(out.state.runs.map((r) => r.nodeId)).toEqual([
			"search",
			"on_search",
			"select",
			"on_select",
		]);
		expect(out.steps.at(-1)?.outcome).toBe("end");
		// Each generated payload was replayed through recognise.
		expect(Object.keys(out.state.recognitions)).toHaveLength(4);
		expect(out.state.recognitions[1].node?.id).toBe("on_search");
		expect(getRunStatusV2(executor, out.state, happy)).toEqual({
			search: "done",
			on_search: "done",
			select: "done",
			on_select: "done",
		});
	});

	it("plays one side: sends its nodes, awaits and receives the counterparty's", async () => {
		const executor = new GraphExecutorV2(linear, options);
		let state = createGraphRunV2(executor, { journey: happy });

		// The mock is the BAP: it sends search, then waits for on_search.
		let out = await runUntilV2(executor, state, happy, { plays: "BAP" });
		state = out.state;
		expect(state.runs.map((r) => r.nodeId)).toEqual(["search"]);
		expect(out.steps.at(-1)?.plan).toMatchObject({
			kind: "await",
			node: { id: "on_search" },
		});
		expect(getRunStatusV2(executor, state, happy, "BAP")).toMatchObject({
			search: "done",
			on_search: "awaiting",
		});
		// No recognition replay on a one-sided run unless asked.
		expect(state.recognitions).toEqual({});

		const searchId = state.session.events[0].messageId;
		const got = await receiveV2(
			executor,
			state,
			happy,
			incoming("on_search", searchId),
			{ plays: "BAP" },
		);
		expect(got.error).toBeUndefined();
		expect(got.run?.event?.direction).toBe("in");
		expect(got.run?.event?.messageId).toBe(searchId);
		state = got.state;

		out = await runUntilV2(executor, state, happy, { plays: "BAP" });
		state = out.state;
		expect(state.runs.map((r) => r.nodeId)).toEqual([
			"search",
			"on_search",
			"select",
		]);
		expect(planV2(executor, state, happy, "BAP")).toMatchObject({
			kind: "await",
			node: { id: "on_select" },
		});
	});

	it("blocks on requirements when playing one side: a callback answers with v1's error, a request sends nothing", async () => {
		const notMet = b64(
			`function meetsRequirements(sessionData) { return { valid: false, code: 412, description: "no stock" }; }`,
		);
		const blocking = { generate: template("generate"), requirements: notMet };
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				apiNode("on_search", "on_search", {
					responseFor: "search",
					code: blocking,
				}),
				apiNode("select", "select", { code: blocking }),
				apiNode("status", "status", { kind: "on_demand", code: blocking }),
			],
			edges: [
				{ id: "a", from: "search", to: "on_search", kind: "response" },
				{ id: "b", from: "on_search", to: "select", kind: "next" },
			],
		};
		const executor = new GraphExecutorV2(graph, options);

		// The mock is the BPP: the participant's search arrives, on_search is blocked.
		const received = await receiveV2(
			executor,
			createGraphRunV2(executor, { journey: happy }),
			happy,
			incoming("search", "m-search"),
			{ plays: "BPP" },
		);
		const step = await stepV2(executor, received.state, happy, {
			plays: "BPP",
		});
		expect(step.outcome).toBe("failed");
		expect(step.run?.requirementsFailed).toBe(true);
		expect(step.run?.generate).toBeUndefined();
		// The host sends this event's payload: v1's error, answering the search.
		expect(step.run?.event).toMatchObject({
			direction: "out",
			status: "ERROR",
			messageId: "m-search",
		});
		const payload = step.run?.event?.payload as any;
		expect(payload.error.code).toBe("REQUIREMENTS_NOT_MET");
		expect(payload.context).toMatchObject({
			action: "on_search",
			message_id: "m-search",
		});
		expect(step.state.failure).toEqual({
			nodeId: "on_search",
			reason: expect.stringMatching(/requirements not met: no stock/),
			cause: "requirements",
		});
		expect(step.logs).toEqual([expect.objectContaining({ level: "error" })]);
		expect(planV2(executor, step.state, happy, "BPP")).toEqual({
			kind: "stopped",
			reason: "failure",
		});
		expect(getRunStatusV2(executor, step.state, happy, "BPP").on_search).toBe(
			"failed",
		);

		// skipRequirements (v1's SKIP_MEETS_REQUIRMENTS) never runs the check.
		const skipped = await stepV2(executor, received.state, happy, {
			plays: "BPP",
			skipRequirements: true,
		});
		expect(skipped.outcome).toBe("ran");
		expect(skipped.run?.requirements).toBeUndefined();
		// `record` can be asked for explicitly on one side too.
		const recorded = await stepV2(executor, received.state, happy, {
			plays: "BPP",
			requirements: "record",
		});
		expect(recorded.outcome).toBe("ran");
		expect(recorded.state.failure).toBeNull();

		// The mock is the BAP and its own request is blocked: nothing to send.
		let bap = (
			await stepV2(
				executor,
				createGraphRunV2(executor, { journey: happy }),
				happy,
				{
					plays: "BAP",
				},
			)
		).state;
		bap = (
			await receiveV2(
				executor,
				bap,
				happy,
				incoming("on_search", bap.session.events[0].messageId),
				{ plays: "BAP" },
			)
		).state;
		const select = await stepV2(executor, bap, happy, { plays: "BAP" });
		expect(select.outcome).toBe("failed");
		expect(select.run?.requirementsFailed).toBe(true);
		expect(select.run?.event).toBeUndefined();
		expect(select.state.session).toBe(bap.session);
		expect(select.state.failure).toMatchObject({
			nodeId: "select",
			cause: "requirements",
		});

		// A blocked trigger fails only itself, not the run it isn't part of.
		const trigger = await triggerV2(executor, bap, "status", undefined, {
			plays: "BAP",
		});
		expect(trigger.run?.requirementsFailed).toBe(true);
		expect(trigger.state.failure).toBeNull();
		expect(trigger.logs[0].level).toBe("error");
		const forced = await triggerV2(executor, bap, "status", undefined, {
			plays: "BAP",
			skipRequirements: true,
		});
		expect(forced.run?.ok).toBe(true);
	});

	it("records a failing meetsRequirements in the simulation and warns", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: linear.nodes.map((n) =>
				n.id === "on_search"
					? {
							...n,
							code: {
								...n.code,
								requirements: b64(
									`function meetsRequirements(sessionData) { return { valid: false, code: 412, description: "no stock" }; }`,
								),
							},
						}
					: n,
			),
			edges: linear.edges,
		};
		const executor = new GraphExecutorV2(graph, options);
		const out = await runUntilV2(
			executor,
			createGraphRunV2(executor, { journey: happy }),
			happy,
		);
		expect(out.state.runs.map((r) => r.nodeId)).toEqual([
			"search",
			"on_search",
			"select",
			"on_select",
		]);
		expect(out.state.failure).toBeNull();
		expect(out.steps[1].logs).toEqual([
			{
				level: "warn",
				message:
					"on_search: sent · requirements not met (no stock) · generated anyway; a live run answers REQUIREMENTS_NOT_MET here instead",
			},
		]);
	});

	it("refuses a payload the host plays, an unexpected one, and after a stop", async () => {
		const executor = new GraphExecutorV2(linear, options);
		let state = createGraphRunV2(executor, { journey: happy });
		state = (await stepV2(executor, state, happy, { plays: "BAP" })).state;

		const wrong = await receiveV2(
			executor,
			state,
			happy,
			incoming("on_select", "m1"),
			{ plays: "BAP" },
		);
		expect(wrong.error).toMatch(/none of the steps/);
		expect(wrong.state).toBe(state);

		// Mock as BPP: search is the NP's; on_search is the mock's own.
		const bpp = createGraphRunV2(executor, { journey: happy });
		const own = await receiveV2(
			executor,
			bpp,
			happy,
			incoming("search", "m2"),
			{ plays: "BAP" },
		);
		expect(own.error).toMatch(/sent by this side/);

		const stopped = await receiveV2(
			executor,
			{ ...state, finished: true },
			happy,
			incoming("on_search", "m3"),
			{ plays: "BAP" },
		);
		expect(stopped.error).toMatch(/stopped/);
	});

	it("waits for inputs on a node that has them, then runs with them", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search", {
					inputs: {
						id: "q",
						jsonSchema: { type: "object", properties: { city: {} } },
					},
				}),
			],
			edges: [],
		};
		const executor = new GraphExecutorV2(graph, options);
		const state = createGraphRunV2(executor, { journey: happy });
		const pending = await stepV2(executor, state, happy);
		expect(pending.outcome).toBe("pending");
		expect(pending.plan.kind).toBe("inputs");
		const ran = await stepV2(executor, state, happy, {
			inputs: { city: "std:080" },
		});
		expect(ran.outcome).toBe("ran");
		expect(ran.run?.event?.inputs).toEqual({ city: "std:080" });
	});

	it("skips a journey's optional node and fails on a decision deviation", async () => {
		const decide = b64(`function decide(sessionData) { return "known"; }`);
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				apiNode("on_search", "on_search", {
					responseFor: "search",
					optional: true,
				}),
				{
					id: "who",
					api: "decision",
					owner: "BPP",
					kind: "decision",
					cases: ["known", "unknown"],
					code: { decide },
				},
				apiNode("select_a", "select"),
				apiNode("select_b", "select"),
			],
			edges: [
				{ id: "a", from: "search", to: "on_search", kind: "response" },
				{ id: "b", from: "on_search", to: "who", kind: "next" },
				{ id: "c", from: "who", to: "select_a", kind: "branch", case: "known" },
				{
					id: "d",
					from: "who",
					to: "select_b",
					kind: "branch",
					case: "unknown",
				},
			],
		};
		const journey: JourneyV2 = {
			...happy,
			skips: ["on_search"],
			expects: { who: "unknown" },
		};
		const executor = new GraphExecutorV2(graph, options);
		const out = await runUntilV2(
			executor,
			createGraphRunV2(executor, { journey }),
			journey,
			{ plays: "BAP" },
		);
		expect(out.state.runs.map((r) => [r.nodeId, !!r.skipped])).toEqual([
			["search", false],
			["on_search", true],
			["who", false],
		]);
		expect(out.state.deviation).toEqual({
			nodeId: "who",
			expected: "unknown",
			actual: "known",
		});
		expect(out.steps.at(-1)?.outcome).toBe("failed");
		expect(planV2(executor, out.state, journey)).toEqual({
			kind: "stopped",
			reason: "deviation",
		});
		expect(getRunStatusV2(executor, out.state, journey).who).toBe("failed");
	});

	it("fails with the cause of each rule that stops a run", async () => {
		const loop = (patch: Partial<GraphNodeV2>, decide: string) =>
			new GraphExecutorV2(
				{
					nodes: [
						apiNode("status", "status", patch),
						{
							id: "again",
							api: "decision",
							owner: "BAP",
							kind: "decision",
							cases: ["again"],
							code: { decide: b64(decide) },
						},
					],
					edges: [
						{ id: "a", from: "status", to: "again", kind: "next" },
						{
							id: "b",
							from: "again",
							to: "status",
							kind: "branch",
							case: "again",
						},
					],
				},
				options,
			);

		// exit: a repeat-until node reached its limit before its exit condition.
		const exit = new GraphExecutorV2(
			{
				nodes: [
					apiNode("status", "status", {
						code: {
							generate: template("generate"),
							exit: b64(
								`function exit(payload, sessionData) { return false; }`,
							),
						},
						repeat: { max: 2, until: true },
					}),
				],
				edges: [],
			},
			options,
		);
		const exited = await runUntilV2(exit, createGraphRunV2(exit, {}), null);
		expect(exited.steps.at(-1)?.plan).toMatchObject({
			kind: "failed",
			nodeId: "status",
			cause: "exit",
		});
		expect(exited.state.failure).toMatchObject({
			nodeId: "status",
			cause: "exit",
		});

		// repeat: a decision led back into a node that has run its repeat.max.
		const repeat = loop(
			{ start: true, repeat: { max: 2 } },
			`function decide(s) { return "again"; }`,
		);
		const repeated = await runUntilV2(
			repeat,
			createGraphRunV2(repeat, {}),
			null,
		);
		expect(repeated.state.runs.map((r) => r.nodeId)).toEqual([
			"status",
			"again",
			"status",
			"again",
		]);
		expect(repeated.steps.at(-1)?.plan).toMatchObject({
			kind: "failed",
			nodeId: "again",
			cause: "repeat",
		});
		expect(repeated.state.failure?.cause).toBe("repeat");
		expect(planV2(repeat, repeated.state, null)).toEqual({
			kind: "stopped",
			reason: "failure",
		});
		// Stored state round-trips with its cause.
		expect(JSON.parse(JSON.stringify(repeated.state)).failure.cause).toBe(
			"repeat",
		);

		// no-wire: decide returned a case nothing is wired for. The run stops
		// (it used to sit on the same plan, so no host heard of it).
		const unwired = loop(
			{ start: true },
			`function decide(s) { return "elsewhere"; }`,
		);
		const stuck = await runUntilV2(
			unwired,
			createGraphRunV2(unwired, {}),
			null,
		);
		expect(stuck.steps.at(-1)).toMatchObject({
			outcome: "failed",
			plan: { kind: "run", node: { id: "again" } },
		});
		expect(stuck.state.failure).toMatchObject({
			nodeId: "again",
			cause: "no-wire",
		});
		expect(stuck.state.failure?.reason).toMatch(/expected one of again/);
		expect(planV2(unwired, stuck.state, null)).toEqual({
			kind: "stopped",
			reason: "failure",
		});
		expect(getRunStatusV2(unwired, stuck.state, null).again).toBe("failed");

		// A stored decision whose wire is gone: the plan fails with no-wire.
		const decided = await runUntilV2(
			repeat,
			createGraphRunV2(repeat, {}),
			null,
			{ limit: 2 },
		);
		const rewired = new GraphExecutorV2(
			{ ...repeat.graph, edges: repeat.graph.edges.filter((e) => !e.case) },
			options,
		);
		expect(planV2(rewired, decided.state, null)).toMatchObject({
			kind: "failed",
			nodeId: "again",
			cause: "no-wire",
		});

		// A decide that fails to run stops the run too, with no cause.
		const broken = loop(
			{ start: true },
			`function decide(s) { throw new Error("boom"); }`,
		);
		const threw = await runUntilV2(broken, createGraphRunV2(broken, {}), null);
		expect(threw.state.failure?.nodeId).toBe("again");
		expect(threw.state.failure?.reason).toMatch(/boom/);
		expect(threw.state.failure?.cause).toBeUndefined();
	});

	it("triggers on-demand nodes off the main path, asking for inputs first", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search"),
				apiNode("status", "status", {
					kind: "on_demand",
					inputs: { jsonSchema: { type: "object", properties: { a: {} } } },
				}),
			],
			edges: [{ id: "x", from: "search", to: "status", kind: "on_demand" }],
		};
		const executor = new GraphExecutorV2(graph, options);
		let state = (await stepV2(executor, createGraphRunV2(executor, {}), null))
			.state;
		const ask = await triggerV2(executor, state, "status");
		expect(ask.pending).toMatchObject({ kind: "inputs", extra: true });
		const ran = await triggerV2(executor, state, "status", { a: 1 });
		expect(ran.run?.ok).toBe(true);
		expect(ran.run?.event?.extra).toBe(true);
		state = ran.state;
		// The main path did not move.
		expect(planV2(executor, state, null).kind).toBe("end");
	});

	it("keeps a callback paired with its request when an on-demand node is triggered between them", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				...linear.nodes,
				apiNode("status", "status", { kind: "on_demand" }),
			],
			edges: linear.edges,
		};
		const executor = new GraphExecutorV2(graph, options);
		let state = (await stepV2(executor, createGraphRunV2(executor, {}), null))
			.state;
		const searchId = state.session.events[0].messageId;
		const triggered = await triggerV2(executor, state, "status");
		expect(triggered.run?.ok).toBe(true);
		state = triggered.state;
		expect(state.session.events[1].messageId).not.toBe(searchId);

		const step = await stepV2(executor, state, null);
		expect(step.run?.nodeId).toBe("on_search");
		expect((step.run?.event?.payload as any).context.message_id).toBe(searchId);
	});

	it("settles past the journey's skips and decisions without sending", async () => {
		const graphFor = (decide: string): ProtocolGraphV2 => ({
			nodes: [
				{
					id: "who",
					api: "decision",
					owner: "BPP",
					kind: "decision",
					start: true,
					cases: ["known", "unknown"],
					code: { decide: b64(`function decide(s) { return ${decide}; }`) },
				},
				apiNode("note", "on_status", { kind: "unsolicited", optional: true }),
				apiNode("search", "search"),
				apiNode("on_search", "on_search", { responseFor: "search" }),
			],
			edges: [
				{ id: "a", from: "who", to: "note", kind: "branch", case: "known" },
				{
					id: "b",
					from: "who",
					to: "on_search",
					kind: "branch",
					case: "unknown",
				},
				{ id: "c", from: "note", to: "search", kind: "next" },
				{ id: "d", from: "search", to: "on_search", kind: "response" },
			],
		});
		const journey: JourneyV2 = {
			...happy,
			entry: "who",
			skips: ["note"],
			expects: { who: "known" },
		};
		const executor = new GraphExecutorV2(graphFor(`"known"`), options);
		const start = createGraphRunV2(executor, { journey });

		// The mock is the BPP: past the decision and the skip, it awaits the
		// participant's search, so the participant opens this journey.
		const bpp = await settleV2(executor, start, journey, { plays: "BPP" });
		expect(bpp.steps.map((s) => [s.plan.kind, s.outcome])).toEqual([
			["run", "ran"],
			["skip", "ran"],
		]);
		expect(bpp.state.runs.map((r) => r.nodeId)).toEqual(["who", "note"]);
		expect(bpp.plan).toMatchObject({ kind: "await", node: { id: "search" } });
		expect(bpp.limited).toBe(false);
		// Nothing was sent: a decision event and a skip, no payload.
		expect(bpp.state.session.events.map((e) => e.payload)).toEqual([
			{ case: "known" },
			null,
		]);

		// The mock is the BAP: it stops before its own search, without running it.
		const bap = await settleV2(executor, start, journey, { plays: "BAP" });
		expect(bap.state.runs.map((r) => r.nodeId)).toEqual(["who", "note"]);
		expect(bap.plan).toMatchObject({ kind: "run", node: { id: "search" } });

		// Already settled: nothing to do.
		const again = await settleV2(executor, bap.state, journey, {
			plays: "BAP",
		});
		expect(again.steps).toEqual([]);
		expect(again.state).toBe(bap.state);

		// `limit` stops it early.
		const limited = await settleV2(executor, start, journey, { limit: 1 });
		expect(limited.steps).toHaveLength(1);
		expect(limited.limited).toBe(true);
		expect(limited.plan).toMatchObject({ kind: "skip", node: { id: "note" } });

		// A decide that leads nowhere stops it: the run fails.
		const unwired = new GraphExecutorV2(graphFor(`"elsewhere"`), options);
		const failed = await settleV2(
			unwired,
			createGraphRunV2(unwired, { journey }),
			journey,
			{ plays: "BPP" },
		);
		expect(failed.steps.map((s) => s.outcome)).toEqual(["failed"]);
		expect(failed.state.failure).toMatchObject({
			nodeId: "who",
			cause: "no-wire",
		});
		expect(failed.plan).toEqual({ kind: "stopped", reason: "failure" });

		// So does a decision that deviates from the journey.
		const deviates = new GraphExecutorV2(graphFor(`"unknown"`), options);
		const deviated = await settleV2(
			deviates,
			createGraphRunV2(deviates, { journey }),
			journey,
			{ plays: "BPP" },
		);
		expect(deviated.steps.map((s) => s.outcome)).toEqual(["failed"]);
		expect(deviated.state.deviation).toMatchObject({
			nodeId: "who",
			actual: "unknown",
		});
		expect(deviated.plan).toEqual({ kind: "stopped", reason: "deviation" });
	});

	it("finishes only at an end-marked node", async () => {
		const graph: ProtocolGraphV2 = {
			nodes: [
				apiNode("search", "search", { end: true }),
				apiNode("select", "select"),
			],
			edges: [{ id: "a", from: "search", to: "select", kind: "next" }],
		};
		const executor = new GraphExecutorV2(graph, options);
		const start = createGraphRunV2(executor, {});
		expect(finishV2(executor, start, null)).toBeNull();
		const after = (await stepV2(executor, start, null)).state;
		const done = finishV2(executor, after, null);
		expect(done?.finished).toBe(true);
		expect(planV2(executor, done!, null)).toEqual({
			kind: "stopped",
			reason: "finished",
		});
	});

	it("continues a JSON round-tripped state on a new executor instance", async () => {
		const first = new GraphExecutorV2(linear, options);
		let state: GraphRunStateV2 = createGraphRunV2(first, {
			transactionId: "tx-live",
			journey: happy,
		});
		state = (await stepV2(first, state, happy, { plays: "BAP" })).state;
		const stored = JSON.parse(JSON.stringify(state)) as GraphRunStateV2;

		const second = new GraphExecutorV2(
			JSON.parse(JSON.stringify(linear)),
			options,
		);
		const searchId = stored.session.events[0].messageId;
		const got = await receiveV2(
			second,
			stored,
			happy,
			incoming("on_search", searchId),
			{ plays: "BAP" },
		);
		const next = await stepV2(second, got.state, happy, { plays: "BAP" });
		expect(next.run?.nodeId).toBe("select");
		const ctx = (next.run?.event?.payload as any).context;
		expect(ctx.transaction_id).toBe("tx-live");
	});
});

describe("LiveGraphConfigV2Schema", () => {
	const doc = {
		kind: "graph-v2-live",
		meta: { domain: "ONDC:TRV14", version: "2.0.0", playground_version: "v2" },
		transaction_data: transactionData,
		helperLib: "",
		graph: linear,
		journeys: [happy],
		view: { anything: true },
	};

	it("accepts a live document and keeps unknown keys", () => {
		const parsed = parseLiveGraphConfigV2({ ...doc, extra: 1 });
		expect(parsed.graph.nodes).toHaveLength(4);
		expect((parsed as any).extra).toBe(1);
		expect((parsed.graph.nodes[0] as any).code.generate).toBeDefined();
	});

	it("rejects a v1 config and a document without journeys", () => {
		expect(() =>
			parseLiveGraphConfigV2({
				meta: { domain: "d", version: "v", flowId: "f" },
			}),
		).toThrow();
		expect(() => parseLiveGraphConfigV2({ ...doc, journeys: [] })).toThrow();
	});
});
