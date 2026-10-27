import { MockRunner } from "../lib/MockRunner";
import { createInitialMockConfig } from "../lib/configHelper";
import { GraphExecutorV2, graphFromV1ConfigV2 } from "../lib/v2";

// A v1 config runs through the graph executor and comes out as v1 would run it.

afterAll(async () => {
	const shared = (MockRunner as any).sharedRunner;
	if (shared?.terminate) await shared.terminate();
	(MockRunner as any).sharedRunner = undefined;
	GraphExecutorV2.terminateSharedRunner();
});

const buildConfig = () => {
	const config = createInitialMockConfig("ONDC:TRV14", "2.0.0", "happy_flow");
	const runner = new MockRunner(config);
	const search = runner.getDefaultStep("search", "search");
	const onSearch = runner.getDefaultStep("on_search", "on_search");
	onSearch.responseFor = "search";
	const select = runner.getDefaultStep("select", "select");
	const status = runner.getDefaultStep("status", "status");
	for (const step of [search, onSearch, select, status]) {
		// The default step asks for inputs; the simulated run passes none.
		step.mock.inputs = {};
	}
	config.steps = [search, onSearch, select];
	config.extra_steps = { steps: [status] };
	return config;
};

describe("graphFromV1ConfigV2", () => {
	it("maps steps to a linear graph, extra steps to on-demand nodes", () => {
		const { graph, journey, options } = graphFromV1ConfigV2(buildConfig());
		expect(graph.nodes.map((n) => [n.id, n.kind])).toEqual([
			["search", "request"],
			["on_search", "callback"],
			["select", "request"],
			["status", "on_demand"],
		]);
		expect(graph.edges.map((e) => [e.from, e.to, e.kind])).toEqual([
			["search", "on_search", "response"],
			["on_search", "select", "next"],
		]);
		expect(journey).toMatchObject({
			id: "happy_flow",
			entry: "search",
			onDemand: ["status"],
		});
		expect(options.domain).toBe("ONDC:TRV14");
		expect(graph.nodes[0].saveData).toHaveProperty(
			"transactionId",
			"$.context.transaction_id",
		);
	});

	it("runs with v1's session data and context", async () => {
		const config = buildConfig();
		const { graph, journey, options } = graphFromV1ConfigV2(config);
		const executor = new GraphExecutorV2(graph, options);
		let session = executor.createSession({
			mode: "journey",
			journeyId: journey.id,
		});

		for (const expected of ["search", "on_search", "select"]) {
			const next = executor.next(session, journey);
			expect(next.auto?.id).toBe(expected);
			const out = await executor.runStep(session, expected);
			expect(out.run.ok).toBe(true);
			session = out.session;
		}
		expect(executor.next(session, journey).end).toBe(true);

		// v1 on the same history: identical session data for the next step.
		// Re-parsed: worker payloads are another realm's objects under jest's
		// sandbox, and v1's jsonpath asserts `instanceof Object`.
		config.transaction_history = session.events.map((e) => ({
			action_id: e.nodeId,
			action: e.api,
			payload: JSON.parse(JSON.stringify(e.payload)),
			saved_info: {},
		}));
		const v1Session = await new MockRunner(config).getSessionDataUpToStep(3);
		// …plus what v1's playground assigns on top before every run.
		Object.assign(v1Session, {
			...config.transaction_data.external_session_data,
			bapUri: config.transaction_data.bap_uri,
			bppUri: config.transaction_data.bpp_uri,
		});
		const graphSession = executor.getSessionData(session);
		for (const key of Object.keys(v1Session)) {
			expect({ key, value: graphSession[key] }).toEqual({
				key,
				value: v1Session[key],
			});
		}
		expect(graphSession.transactionId).toEqual([
			config.transaction_data.transaction_id,
		]);

		const ctx = session.events.map((e) => (e.payload as any).context);
		expect(ctx[1].message_id).toBe(ctx[0].message_id);
		expect(
			ctx.every(
				(c) => c.transaction_id === config.transaction_data.transaction_id,
			),
		).toBe(true);

		// The extra step runs on demand without moving the main path.
		const extra = await executor.runStep(session, "status");
		expect(extra.run.ok).toBe(true);
		expect(executor.next(extra.session, journey).end).toBe(true);
	});
});
