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
