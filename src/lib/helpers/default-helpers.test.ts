/**
 * Unit tests for the default helper functions + bundle integrity.
 *
 * Unit tests import the functions as a normal CJS module and call them.
 * The bundle test loads DEFAULT_HELPER_LIB into a fresh vm context — this
 * simulates how the string is actually used in the worker sandbox and
 * catches any stringification / hoisting / free-variable regressions.
 */

import * as vm from "vm";
import {
	getSubscriberUrl,
	uuidv4,
	generate6DigitId,
	currentTimestamp,
	isoDurToSec,
	setCityFromInputs,
	createFormURL,
	generateConsentHandler,
} from "./default-helpers";
import { DEFAULT_HELPER_LIB } from "./index";

describe("default helpers — unit", () => {
	describe("uuidv4", () => {
		it("matches the RFC 4122 v4 shape", () => {
			expect(uuidv4()).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
			);
		});

		it("produces distinct values", () => {
			expect(uuidv4()).not.toBe(uuidv4());
		});
	});

	describe("generate6DigitId", () => {
		it("returns a 6-digit string in [100000, 999999]", () => {
			for (let i = 0; i < 50; i++) {
				const id = generate6DigitId();
				expect(id).toMatch(/^\d{6}$/);
				const n = parseInt(id, 10);
				expect(n).toBeGreaterThanOrEqual(100000);
				expect(n).toBeLessThanOrEqual(999999);
			}
		});
	});

	describe("currentTimestamp", () => {
		it("returns a parseable ISO timestamp close to now", () => {
			const before = Date.now();
			const ts = currentTimestamp();
			const after = Date.now();
			const parsed = Date.parse(ts);
			expect(parsed).toBeGreaterThanOrEqual(before);
			expect(parsed).toBeLessThanOrEqual(after);
			expect(ts.endsWith("Z")).toBe(true);
		});
	});

	describe("isoDurToSec", () => {
		it.each([
			["PT30S", 30],
			["PT5M", 300],
			["PT1H", 3600],
			["P1D", 86400],
			["PT1H30M", 5400],
			["PT0S", 0],
		])("%s → %d sec", (dur, expected) => {
			expect(isoDurToSec(dur)).toBe(expected);
		});

		it("returns 0 on unparseable input", () => {
			expect(isoDurToSec("not-a-duration")).toBe(0);
		});
	});

	describe("setCityFromInputs", () => {
		it("writes flat context.city for v1.x", () => {
			const payload = { context: { core_version: "1.2.0", city: "*" } };
			setCityFromInputs(payload, { city_code: "std:080" });
			expect(payload.context.city).toBe("std:080");
		});

		it("writes nested context.location.city.code for v2.x", () => {
			const payload = {
				context: { version: "2.0.0", location: { city: { code: "*" } } },
			};
			setCityFromInputs(payload, { city_code: "std:011" });
			expect(payload.context.location.city.code).toBe("std:011");
		});

		it("falls back to '*' when city_code is missing", () => {
			const payload = {
				context: { version: "2.0.0", location: { city: { code: "foo" } } },
			};
			setCityFromInputs(payload, {});
			expect(payload.context.location.city.code).toBe("*");
		});

		it("no-ops when inputs is falsy", () => {
			const payload = {
				context: { version: "2.0.0", location: { city: { code: "keep" } } },
			};
			setCityFromInputs(payload, null);
			expect(payload.context.location.city.code).toBe("keep");
		});
	});

	describe("createFormURL", () => {
		it("interpolates domain, formId, transactionId, sessionId", () => {
			const url = createFormURL("ONDC:RET10", "FORM_A", {
				mockBaseUrl: "https://mocks.example.com",
				transactionId: ["txn-xyz"],
				sessionId: "sess-1",
			});
			expect(url).toBe(
				"https://mocks.example.com/forms/ONDC:RET10/FORM_A/?transaction_id=txn-xyz&session_id=sess-1",
			);
		});
	});

	describe("getSubscriberUrl", () => {
		const sessionData = { bppUri: "https://bpp.example.com", bapUri: "https://bap.example.com" };

		it("returns bppUri when type is 'bpp'", () => {
			expect(getSubscriberUrl(sessionData, "bpp")).toBe("https://bpp.example.com");
		});

		it("returns bapUri otherwise", () => {
			expect(getSubscriberUrl(sessionData, "bap")).toBe("https://bap.example.com");
			expect(getSubscriberUrl(sessionData, "anything-else")).toBe(
				"https://bap.example.com",
			);
		});
	});

	describe("generateConsentHandler", () => {
		type FakeResponseInit = {
			ok: boolean;
			status?: number;
			json?: () => Promise<any>;
			text?: () => Promise<string>;
		};
		function fakeResponse(init: FakeResponseInit) {
			return {
				ok: init.ok,
				status: init.status ?? (init.ok ? 200 : 500),
				json: init.json ?? (async () => ({})),
				text: init.text ?? (async () => ""),
			};
		}

		let fetchSpy: jest.SpiedFunction<typeof fetch>;

		beforeEach(() => {
			fetchSpy = jest.spyOn(global, "fetch");
		});

		afterEach(() => {
			fetchSpy.mockRestore();
		});

		it("throws when custId is missing", async () => {
			await expect(
				generateConsentHandler({ finvuUrl: "http://finvu" }, {} as any),
			).rejects.toThrow("custId is required");
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it("throws when sessionData.finvuUrl is missing", async () => {
			await expect(
				generateConsentHandler({} as any, { custId: "c1" }),
			).rejects.toThrow("sessionData.finvuUrl is required");
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it("POSTs JSON to /finvu-aa/consent/generate and returns consentHandler", async () => {
			fetchSpy.mockResolvedValueOnce(
				fakeResponse({
					ok: true,
					json: async () => ({ consentHandler: "HANDLE-123" }),
				}) as any,
			);

			const result = await generateConsentHandler(
				{ finvuUrl: "http://finvu.local:3002" },
				{ custId: "cust-42" },
			);

			expect(result).toBe("HANDLE-123");
			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const [url, init] = fetchSpy.mock.calls[0];
			expect(url).toBe("http://finvu.local:3002/finvu-aa/consent/generate");
			expect(init?.method).toBe("POST");
			expect((init?.headers as any)["Content-Type"]).toBe("application/json");
			const body = JSON.parse(init?.body as string);
			expect(body).toEqual({
				custId: "cust-42",
				templateName: "FINVUDEMO_TESTING",
				consentDescription: "Gold Loan Account Aggregator Consent",
				redirectUrl: "https://google.co.in",
			});
			expect(init?.signal).toBeDefined();
		});

		it("throws 'Request failed' on non-OK responses", async () => {
			fetchSpy.mockResolvedValueOnce(
				fakeResponse({
					ok: false,
					status: 503,
					text: async () => "Service Unavailable",
				}) as any,
			);

			await expect(
				generateConsentHandler(
					{ finvuUrl: "http://finvu.local" },
					{ custId: "c1" },
				),
			).rejects.toThrow("Request failed: 503 Service Unavailable");
		});

		it("throws when consentHandler is missing from response body", async () => {
			fetchSpy.mockResolvedValueOnce(
				fakeResponse({
					ok: true,
					json: async () => ({ somethingElse: true }),
				}) as any,
			);

			await expect(
				generateConsentHandler(
					{ finvuUrl: "http://finvu.local" },
					{ custId: "c1" },
				),
			).rejects.toThrow("Invalid response: consentHandler missing");
		});

		it("surfaces AbortError as a timeout message", async () => {
			fetchSpy.mockImplementationOnce(async () => {
				const err: any = new Error("aborted");
				err.name = "AbortError";
				throw err;
			});

			await expect(
				generateConsentHandler(
					{ finvuUrl: "http://finvu.local" },
					{ custId: "c1" },
				),
			).rejects.toThrow("Request timed out after 10 seconds");
		});
	});
});

describe("DEFAULT_HELPER_LIB bundle", () => {
	const EXPECTED_NAMES = [
		"getSubscriberUrl",
		"uuidv4",
		"generate6DigitId",
		"currentTimestamp",
		"isoDurToSec",
		"setCityFromInputs",
		"createFormURL",
		"generateConsentHandler",
	];

	function loadBundle() {
		const sandbox: Record<string, unknown> = {};
		vm.createContext(sandbox);
		vm.runInContext(DEFAULT_HELPER_LIB, sandbox);
		return sandbox;
	}

	it("does not leak `module.exports` or `require` into the bundle source", () => {
		expect(DEFAULT_HELPER_LIB).not.toMatch(/module\.exports/);
		expect(DEFAULT_HELPER_LIB).not.toMatch(/\brequire\s*\(/);
	});

	it("declares every expected helper as a function", () => {
		const sandbox = loadBundle();
		for (const name of EXPECTED_NAMES) {
			expect(typeof sandbox[name]).toBe("function");
		}
	});

	it("round-trips key helpers when executed in the vm context", () => {
		const sandbox = loadBundle() as any;
		expect(sandbox.uuidv4()).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(sandbox.generate6DigitId()).toMatch(/^\d{6}$/);
		expect(sandbox.isoDurToSec("PT1H")).toBe(3600);

		const payload = {
			context: { version: "2.0.0", location: { city: { code: "*" } } },
		};
		sandbox.setCityFromInputs(payload, { city_code: "std:022" });
		expect(payload.context.location.city.code).toBe("std:022");

		expect(
			sandbox.getSubscriberUrl({ bppUri: "http://bpp" }, "bpp"),
		).toBe("http://bpp");
	});

	it("preserves in-body docs so playground users see them", () => {
		// Guard against a future refactor silently dropping the in-body comments
		// the way the pre-refactor .toString() pattern did.
		expect(DEFAULT_HELPER_LIB).toContain("Generates a UUID v4");
		expect(DEFAULT_HELPER_LIB).toContain("ISO 8601 duration");
		expect(DEFAULT_HELPER_LIB).toContain("Finvu AA Service");
	});
});
