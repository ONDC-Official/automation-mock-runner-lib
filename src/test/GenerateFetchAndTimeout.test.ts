/**
 * Tests for generate-only fetch allowlist + 45s sandbox setTimeout cap.
 */

import * as http from "http";
import { AddressInfo } from "net";
import { MockRunner } from "../lib/MockRunner";
import {
	FUNCTION_REGISTRY,
	getFunctionSchema,
} from "../lib/constants/function-registry";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";

function baseConfig(): MockPlaygroundConfigType {
	return {
		meta: { domain: "ONDC:TRV14", version: "2.0.0", flowId: "fetch-test" },
		transaction_data: {
			transaction_id: "e9e0b5cb-3f15-48a1-9d86-d4d643f0909d",
			latest_timestamp: "1970-01-01T00:00:00.000Z",
		},
		steps: [],
		transaction_history: [],
		validationLib: "",
		helperLib: "",
	};
}

function stepWithGenerate(
	runner: MockRunner,
	actionId: string,
	genSource: string,
) {
	const step = runner.getDefaultStep("search", actionId);
	step.mock.generate = MockRunner.encodeBase64(genSource);
	step.mock.inputs = {};
	return step;
}

async function resetSharedRunner() {
	const sr = (MockRunner as any).sharedRunner;
	if (sr?.terminate) {
		await sr.terminate();
	}
	(MockRunner as any).sharedRunner = undefined;
}

describe("generate timeout = 45s", () => {
	afterEach(resetSharedRunner);

	it("schema advertises a 45s timeout for generate", () => {
		expect(FUNCTION_REGISTRY.generate.timeout).toBe(45 * 1000);
		expect(getFunctionSchema("generate").timeout).toBe(45 * 1000);
	});

	it("other function kinds keep their tighter timeouts", () => {
		expect(FUNCTION_REGISTRY.validate.timeout).toBe(5000);
		expect(FUNCTION_REGISTRY.meetsRequirements.timeout).toBe(3000);
	});

	it("sandbox setTimeout accepts delays up to 45000ms (was capped at 35000)", async () => {
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"delayed",
				`async function generate(defaultPayload, sessionData) {
					// Just exercise the clamp — schedule but don't await.
					setTimeout(() => {}, 40000);
					return { scheduled: true };
				}`,
			),
		);

		const res = await r.runGeneratePayload("delayed", {});
		expect(res.success).toBe(true);
		expect(res.result).toEqual({ scheduled: true });
	});

	it("sandbox setTimeout still rejects delays above 45000ms", async () => {
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"too-long",
				`async function generate(defaultPayload, sessionData) {
					setTimeout(() => {}, 60000);
					return {};
				}`,
			),
		);

		const res = await r.runGeneratePayload("too-long", {});
		expect(res.success).toBe(false);
		expect(res.error?.message || "").toMatch(/1-45000ms/);
	});
});

describe("fetch allowlist (generate-only)", () => {
	let server: http.Server;
	let baseUrl: string;

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			switch (req.url) {
				case "/v1/ping":
					res.writeHead(200, { "content-type": "text/plain" });
					res.end("pong");
					return;
				case "/v1/redir":
					res.writeHead(302, { location: "http://127.0.0.1:1/nope" });
					res.end();
					return;
				case "/v10/foo":
					res.writeHead(200);
					res.end("v10");
					return;
				case "/other":
					res.writeHead(200);
					res.end("other");
					return;
				default:
					res.writeHead(404);
					res.end();
			}
		});
		await new Promise<void>((r) =>
			server.listen(0, "127.0.0.1", () => r()),
		);
		const addr = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${addr.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((r) => server.close(() => r()));
	});

	afterEach(resetSharedRunner);

	it("fetch is undefined when allowlist is empty/unset", async () => {
		// No initSharedRunner → default runner has no allowlist.
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"fetch-undef",
				`async function generate(defaultPayload, sessionData) {
					return { t: typeof fetch };
				}`,
			),
		);
		const res = await r.runGeneratePayload("fetch-undef", {});
		expect(res.success).toBe(true);
		expect(res.result).toEqual({ t: "undefined" });
	});

	it("allows fetch matching origin + path prefix", async () => {
		MockRunner.initSharedRunner({
			allowedFetchBaseUrls: [`${baseUrl}/v1`],
		});
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"ok",
				`async function generate(defaultPayload, sessionData) {
					const res = await fetch("${baseUrl}/v1/ping");
					const body = await res.text();
					return { body };
				}`,
			),
		);
		const res = await r.runGeneratePayload("ok", {});
		expect(res.success).toBe(true);
		expect(res.result).toEqual({ body: "pong" });
	});

	it("rejects URLs with non-allowlisted path prefix", async () => {
		MockRunner.initSharedRunner({
			allowedFetchBaseUrls: [`${baseUrl}/v1`],
		});
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"bad-path",
				`async function generate(defaultPayload, sessionData) {
					const res = await fetch("${baseUrl}/other");
					return { body: await res.text() };
				}`,
			),
		);
		const res = await r.runGeneratePayload("bad-path", {});
		expect(res.success).toBe(false);
		expect(res.error?.message || "").toMatch(/fetch blocked/);
	});

	it("treats /v1 as a strict segment prefix (no /v10/* match)", async () => {
		MockRunner.initSharedRunner({
			allowedFetchBaseUrls: [`${baseUrl}/v1`],
		});
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"prefix-strict",
				`async function generate(defaultPayload, sessionData) {
					const res = await fetch("${baseUrl}/v10/foo");
					return { body: await res.text() };
				}`,
			),
		);
		const res = await r.runGeneratePayload("prefix-strict", {});
		expect(res.success).toBe(false);
		expect(res.error?.message || "").toMatch(/fetch blocked/);
	});

	it("rejects different origin even with matching path", async () => {
		MockRunner.initSharedRunner({
			allowedFetchBaseUrls: [`${baseUrl}/v1`],
		});
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"bad-origin",
				`async function generate(defaultPayload, sessionData) {
					const res = await fetch("http://example.invalid/v1/ping");
					return { body: await res.text() };
				}`,
			),
		);
		const res = await r.runGeneratePayload("bad-origin", {});
		expect(res.success).toBe(false);
		expect(res.error?.message || "").toMatch(/fetch blocked/);
	});

	it("blocks 3xx redirects (no allowlist bypass via Location header)", async () => {
		MockRunner.initSharedRunner({
			allowedFetchBaseUrls: [`${baseUrl}/v1`],
		});
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		r.getConfig().steps.push(
			stepWithGenerate(
				r,
				"redir",
				`async function generate(defaultPayload, sessionData) {
					await fetch("${baseUrl}/v1/redir");
					return { ok: true };
				}`,
			),
		);
		const res = await r.runGeneratePayload("redir", {});
		expect(res.success).toBe(false);
		// undici surfaces a TypeError when redirect:'error' encounters a 3xx
		expect(
			(res.error?.message || "").toLowerCase(),
		).toMatch(/redirect|fetch failed/);
	});

	it("fetch is not injected into validate even when allowlist is configured", async () => {
		MockRunner.initSharedRunner({
			allowedFetchBaseUrls: [`${baseUrl}/v1`],
		});
		const cfg = baseConfig();
		const r = new MockRunner(cfg);
		const step = r.getDefaultStep("search", "validate-pure");
		step.mock.inputs = {};
		step.mock.validate = MockRunner.encodeBase64(
			`function validate(targetPayload, sessionData) {
				return {
					valid: typeof fetch === "undefined",
					code: 200,
					description: "fetch-absence probe",
				};
			}`,
		);
		r.getConfig().steps.push(step);

		const res = await r.runValidatePayload("validate-pure", {});
		expect(res.success).toBe(true);
		expect(res.result?.valid).toBe(true);
	});
});
