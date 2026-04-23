/*
 * Default helpers available to every `generate()` in a mock step.
 *
 * Authoring rules (enforced by how this file is consumed, not by tooling):
 *   1. Use `function` declarations only. Arrow `const x = () => {}` stringifies
 *      as an expression — it won't hoist or concat cleanly when each function
 *      is `.toString()`-ed into the helper bundle.
 *   2. No `require` / `import` inside function bodies. The VM sandbox has no
 *      module system. Only sandbox-whitelisted globals (Math, Date, JSON, …)
 *      and sibling helpers are in scope.
 *   3. Cross-helper calls are fine — every function declaration lands in the
 *      same flat script after assembly, and declarations hoist.
 *   4. Put docs INSIDE the function body (first statement). Leading comments
 *      above a declaration are dropped by `fn.toString()`, so they never
 *      reach the assembled bundle.
 *   5. If the helper needs request-scope data, take `sessionData` as an
 *      explicit parameter. Free-variable references to `sessionData` do NOT
 *      resolve at runtime — helpers are declared at script scope, `sessionData`
 *      is only a parameter of `generate()`.
 *
 * The `module.exports = {...}` line at the bottom is only used by Node
 * (index.ts and the Jest tests). `fn.toString()` never includes it, so it
 * doesn't leak into the sandbox string.
 */

function getSubscriberUrl(sessionData, type) {
	// Resolve the BPP or BAP subscriber URL from session data.
	// Usage: getSubscriberUrl(sessionData, "bpp")
	if (type === "bpp") {
		return sessionData.bppUri;
	} else {
		return sessionData.bapUri;
	}
}

function uuidv4() {
	// Generates a UUID v4 (RFC 4122, random-based).
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function generate6DigitId() {
	// Generate a 6-digit numeric string ID in [100000, 999999].
	return Math.floor(100000 + Math.random() * 900000).toString();
}

function currentTimestamp() {
	// Returns the current ISO-8601 UTC timestamp (e.g. "2026-04-23T12:34:56.789Z").
	return new Date().toISOString();
}

function isoDurToSec(duration) {
	/*
	 * Convert an ISO 8601 duration string (e.g. "PT1H30M", "P2DT3H") to total seconds.
	 * Returns 0 for unparseable input.
	 * Approximations used: 1 week = 7 days, 1 month ≈ 30.42 days (2628288 sec),
	 * 1 year = 365 days. Not calendar-exact.
	 */
	const durRE =
		/P((\d+)Y)?((\d+)M)?((\d+)W)?((\d+)D)?T?((\d+)H)?((\d+)M)?((\d+)S)?/;
	const s = durRE.exec(duration);
	if (!s) return 0;

	return (
		(Number(s?.[2]) || 0) * 31536000 +
		(Number(s?.[4]) || 0) * 2628288 +
		(Number(s?.[6]) || 0) * 604800 +
		(Number(s?.[8]) || 0) * 86400 +
		(Number(s?.[10]) || 0) * 3600 +
		(Number(s?.[12]) || 0) * 60 +
		(Number(s?.[14]) || 0)
	);
}

function setCityFromInputs(payload, inputs) {
	/*
	 * Mutates `payload.context` in place to set the city code from `inputs.city_code`.
	 * Version-aware: ONDC v1.x uses flat `context.city`, v2.x uses nested
	 * `context.location.city.code`. Falls back to "*" when city_code is missing.
	 * No-op when `inputs` is falsy.
	 */
	if (!inputs) return "*";
	const version =
		payload.context.version || payload.context.core_version || "2.0.0";
	if (version.startsWith("1")) {
		payload.context.city = inputs.city_code ?? "*";
	} else {
		payload.context.location.city.code = inputs.city_code ?? "*";
	}
}

function createFormURL(domain, formId, sessionData) {
	/*
	 * Build a form submission URL from session data.
	 * Reads sessionData.mockBaseUrl, sessionData.transactionId[0], sessionData.sessionId.
	 * Returns: `${baseURL}/forms/${domain}/${formId}/?transaction_id=...&session_id=...`
	 */
	const baseURL = sessionData.mockBaseUrl;
	const transactionId = sessionData.transactionId[0];
	const sessionId = sessionData.sessionId;
	return `${baseURL}/forms/${domain}/${formId}/?transaction_id=${transactionId}&session_id=${sessionId}`;
}

async function generateConsentHandler(
	sessionData,
	{
		custId,
		templateName = "FINVUDEMO_TESTING",
		consentDescription = "Gold Loan Account Aggregator Consent",
		redirectUrl = "https://google.co.in",
	},
) {
	/*
	 * Generate a consent handler from the Finvu AA Service.
	 * Reads the service base URL from `sessionData.finvuUrl` — the installing
	 * service MUST include that origin in
	 *   MockRunner.initSharedRunner({ allowedFetchBaseUrls: [...] })
	 * otherwise the sandboxed fetch will be blocked.
	 *
	 * Times out after 10s via AbortController.
	 *
	 * @param {Object} sessionData             session data; sessionData.finvuUrl is required
	 * @param {Object} params
	 * @param {string} params.custId           customer ID (required)
	 * @param {string} [params.templateName]
	 * @param {string} [params.consentDescription]
	 * @param {string} [params.redirectUrl]
	 * @returns {Promise<string>} consentHandler
	 */
	if (!custId) {
		throw new Error("custId is required");
	}
	const baseUrl = sessionData && sessionData.finvuUrl;
	if (!baseUrl) {
		throw new Error("sessionData.finvuUrl is required");
	}

	const url = `${baseUrl}/finvu-aa/consent/generate`;

	const payload = {
		custId,
		templateName,
		consentDescription,
		redirectUrl,
	};

	console.log("Calling Finvu AA Service:", url);
	console.log("Consent request payload:", payload);

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10000);

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Request failed: ${res.status} ${text}`);
		}

		const data = await res.json();

		if (!data || !data.consentHandler) {
			throw new Error("Invalid response: consentHandler missing");
		}

		return data.consentHandler;
	} catch (err) {
		if (err && err.name === "AbortError") {
			throw new Error("Request timed out after 10 seconds");
		}
		throw err;
	} finally {
		clearTimeout(timeout);
	}
}

module.exports = {
	getSubscriberUrl,
	uuidv4,
	generate6DigitId,
	currentTimestamp,
	isoDurToSec,
	setCityFromInputs,
	createFormURL,
	generateConsentHandler,
};
