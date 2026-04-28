# @ondc/automation-mock-runner

A TypeScript library for driving ONDC (Open Network for Digital Commerce) transaction flows end-to-end. It turns a **base64-encoded, sandboxed function config** into an executable multi-step flow, handling payload generation, response validation, session state, and (optionally) outbound HTTP — in either Node (worker_threads) or the browser (Web Workers).

## What it does

- **Generate payloads** for every step of a flow, with `context` (domain, version, ids, timestamps, bap/bpp) produced automatically.
- **Validate responses** against custom per-step logic.
- **Check prerequisites** before a step runs.
- **Carry session state** across steps via JSONPath extraction of prior payloads.
- **Sandbox every function** so user-authored JS runs with a whitelisted set of globals and per-function timeouts, and cannot touch the host filesystem, network, or module system — except where the installing service has explicitly allowlisted outbound URLs for `generate`.

## Key Features

- 🔄 Multi-step flow management with automatic `context` building and request/response correlation via `responseFor`.
- 🔒 Worker-thread (Node) / Web Worker (browser) sandbox. Whitelisted globals, per-function timeouts, workers recycled after 100 executions or 10 min.
- 🌐 Opt-in outbound `fetch` from `generate` with a per-installer origin+path allowlist. Redirects blocked (`redirect: "error"`).
- 📚 Built-in **default helper library** (`uuidv4`, `currentTimestamp`, `isoDurToSec`, `setCityFromInputs`, `createFormURL`, `generate6DigitId`, `getSubscriberUrl`, `generateConsentHandler`) prepended to every `generate`.
- ✅ Zod-based config validation, JSON Schema for user inputs.
- 🎯 ONDC-aware: version-aware context (v1.x flat `city`, v2.x nested `location.city.code`), BAP/BPP roles, form steps (`dynamic_form`, `html_form`, `HTML_FORM_MULTI`), dynamic action IDs (`GENERATED#n#action_id`).

## Installation

```bash
npm install @ondc/automation-mock-runner
```

**Requires Node ≥ 18** (the sandbox uses native `fetch` and `AbortController`).

## Quick Start

```typescript
import {
	MockRunner,
	createInitialMockConfig,
} from "@ondc/automation-mock-runner";

// 1. Boot the shared runner once at service startup.
//    Only needed if any `generate` function calls fetch().
MockRunner.initSharedRunner({
	allowedFetchBaseUrls: ["https://dev-automation.ondc.org/finvu"],
});

// 2. Scaffold a config (auto-fills `helperLib` with DEFAULT_HELPER_LIB).
const config = createInitialMockConfig("ONDC:RET11", "2.0.0", "search-flow");

// 3. Add a step. Every helper (uuidv4, currentTimestamp, setCityFromInputs, …)
//    is already in scope inside `generate`.
config.steps.push({
	api: "search",
	action_id: "search_0",
	owner: "BAP",
	responseFor: null,
	unsolicited: false,
	description: "Search for electronics",
	mock: {
		generate: MockRunner.encodeBase64(`
			async function generate(defaultPayload, sessionData) {
				setCityFromInputs(defaultPayload, sessionData.user_inputs);
				defaultPayload.message = {
					intent: {
						category: { descriptor: { name: "Electronics" } },
					},
				};
				return defaultPayload;
			}
		`),
		validate: MockRunner.encodeBase64(`
			function validate(targetPayload, sessionData) {
				if (!targetPayload.message?.catalog?.providers?.length) {
					return { valid: false, code: 400, description: "No providers" };
				}
				return { valid: true, code: 200, description: "ok" };
			}
		`),
		requirements: MockRunner.encodeBase64(`
			function meetsRequirements(sessionData) {
				return { valid: true, code: 200, description: "ready" };
			}
		`),
		defaultPayload: { context: {}, message: {} },
		saveData: { providers: "$.message.catalog.providers" },
		inputs: {
			id: "search_inputs",
			jsonSchema: {
				type: "object",
				properties: { city_code: { type: "string" } },
				required: ["city_code"],
			},
		},
	},
});

// 4. Run.
const runner = new MockRunner(config);
const out = await runner.runGeneratePayload("search_0", {
	city_code: "std:080",
});
console.log(out.result);
```

## Configuration Structure

### Meta

```typescript
meta: {
	domain: string; // e.g. "ONDC:RET11"
	version: string; // e.g. "1.2.0" or "2.0.0" — drives context shape
	flowId: string;
}
```

### Transaction Data

```typescript
transaction_data: {
	transaction_id: string;
	latest_timestamp: string;
	bap_id?: string;
	bap_uri?: string;
	bpp_id?: string;
	bpp_uri?: string;
}
```

### Action Step

```typescript
{
	api: "search" | "select" | "init" | "confirm"
		| "on_search" | "on_select" | /* … */
		| "dynamic_form" | "html_form" | "HTML_FORM_MULTI",
	action_id: string,          // unique within flow
	owner: "BAP" | "BPP",
	responseFor: string | null, // pair this step with a request action_id
	unsolicited: boolean,
	description: string,
	repeatCount?: number,
	force_proceed?: boolean,    // skip the "waiting for input" gate; see Form Steps
	mock: {
		generate: string,        // base64 function
		validate: string,        // base64 function
		requirements: string,    // base64 function
		defaultPayload: object,
		saveData: Record<string, string>,  // JSONPath map; supports APPEND# / EVAL# prefixes
		inputs: object | {},
		formHtml?: string,       // base64 HTML for form steps
	},
}
```

## Base64 Function Requirements

All three user functions must be **complete declarations**:

```js
async function generate(defaultPayload, sessionData) {
	/* … */ return defaultPayload;
}
function validate(targetPayload, sessionData) {
	/* … */ return { valid, code, description };
}
function meetsRequirements(sessionData) {
	/* … */ return { valid, code, description };
}
```

Encode with `MockRunner.encodeBase64(src)`. The runner decodes, prepends `DEFAULT_HELPER_LIB` (for `generate`), and executes inside the sandbox.

## API Reference

### `MockRunner.initSharedRunner(options?)`

Static. Configure the process-wide shared runner at boot. Replaces any existing runner (terminates the old one). Call **once before** constructing any `MockRunner`.

```typescript
MockRunner.initSharedRunner({
	allowedFetchBaseUrls: [
		"https://aa.example.com/finvu-aa",
		"https://api.example.com/v1",
	],
});
```

Empty / omitted `allowedFetchBaseUrls` means `fetch` is not injected into the sandbox at all.

### `new MockRunner(config, skipValidation?)`

Validates the config (Zod) on construction unless `skipValidation: true`.

### `runGeneratePayload(actionId, inputs?, extraSessionData?)`

```typescript
await runner.runGeneratePayload(
	"search_0",
	{ city_code: "std:080" }, // → sessionData.user_inputs
	{ finvuUrl: "https://aa.example.com" }, // shallow-merged into sessionData
);
```

### `runValidatePayload(actionId, targetPayload, extraSessionData?)`

```typescript
await runner.runValidatePayload("on_search_0", incomingPayload, {
	finvuUrl: "https://aa.example.com",
});
```

### `runMeetRequirements(actionId)`

```typescript
await runner.runMeetRequirements("select_0");
```

### With-session variants

Skip the history-based session build and use a caller-supplied object:

- `runGeneratePayloadWithSession(actionId, sessionData)`
- `runValidatePayloadWithSession(actionId, targetPayload, sessionData)`
- `runMeetRequirementsWithSession(actionId, sessionData)`

### `getDefaultStep(api, actionId, formType?)`

Returns a scaffolded step with template functions already base64-encoded. Pass `formType: "dynamic_form" | "html_form"` for form scaffolds.

### `validateConfig()`

Re-validates the stored config; returns `{ success, errors? }`.

### Static utilities

- `MockRunner.encodeBase64(src)` / `decodeBase64(b64)` — work in both Node and browser (use `TextEncoder`/`TextDecoder`, not `Buffer`).

## Default Helpers

Every `generate` call is prefixed with `DEFAULT_HELPER_LIB` — these are always in scope:

| Helper                                                 | Purpose                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `uuidv4()`                                             | RFC 4122 v4 UUID.                                                               |
| `generate6DigitId()`                                   | 6-digit numeric string in `[100000, 999999]`.                                   |
| `currentTimestamp()`                                   | ISO-8601 UTC timestamp.                                                         |
| `isoDurToSec(duration)`                                | ISO 8601 duration → seconds (0 on unparseable input).                           |
| `setCityFromInputs(payload, inputs)`                   | Writes `inputs.city_code` into `payload.context` (v1 flat / v2 nested).         |
| `createFormURL(domain, formId, sessionData)`           | Build a `/forms/<domain>/<formId>/?...` submission URL from session data.       |
| `getSubscriberUrl(sessionData, type)`                  | `"bpp"` → `sessionData.bppUri`; anything else → `bapUri`.                       |
| `generateConsentHandler(sessionData, { custId, ... })` | POSTs to Finvu AA; 10s `AbortController` timeout. Needs `finvuUrl` + allowlist. |

Source: `src/lib/helpers/default-helpers.js`. Edit that file and run `npm run helpers:gen` to refresh the shipped bundle (also regenerated automatically by `npm run build` and `npm test`).

Helpers that need request-scope data (`getSubscriberUrl`, `createFormURL`, `generateConsentHandler`) take `sessionData` as an **explicit first parameter**. Free-variable references do not resolve inside the sandbox — helpers run at script scope, `sessionData` is only a parameter of `generate()`.

## 3rd-party HTTP from `generate`

Outbound HTTP is **opt-in and scoped**:

1. Only `generate` gets `fetch` (validate / meetsRequirements / getSave stay pure).
2. The installing service provides the allowlist at boot:
   ```typescript
   MockRunner.initSharedRunner({
   	allowedFetchBaseUrls: ["https://finvu.example.com/aa"],
   });
   ```
3. Matching rule: request `origin` must equal an entry's origin **and** the request path must be a strict segment-prefix of the entry's path. `/v1` matches `/v1` and `/v1/foo` but **not** `/v10/foo`.
4. Redirects are blocked (`redirect: "error"`) — call final URLs, don't rely on 3xx hops.
5. `AbortController` + `AbortSignal` are in the sandbox; use them for per-request timeouts.

### Worked example — Finvu consent via `generateConsentHandler`

```typescript
// boot
MockRunner.initSharedRunner({
	allowedFetchBaseUrls: ["https://dev-automation.ondc.org/finvu"],
});

// step's generate (base64-encoded)
const src = `
	async function generate(defaultPayload, sessionData) {
		const handle = await generateConsentHandler(sessionData, { custId: "1234" });
		defaultPayload.message.consentHandle = handle;
		return defaultPayload;
	}
`;

// caller passes finvuUrl through extraSessionData
await runner.runGeneratePayload("consent_0", inputs, {
	finvuUrl: "https://dev-automation.ondc.org/finvu",
});
```

## Sandbox globals & limits

**Always available:** `Array, Boolean, Date, Error, JSON, Math, Number, Object, Promise, RegExp, String, Symbol, Map, Set, WeakMap, WeakSet, parseInt, parseFloat, isNaN, isFinite, encodeURI(Component), decodeURI(Component), setTimeout, clearTimeout, AbortController, AbortSignal, console.{log,error,warn,info}`.

**Added for `generate` only** (and only when an allowlist is configured): `fetch, URL, URLSearchParams, Headers, Request, Response`.

**Explicitly denied:** `require, process, global, globalThis, Buffer, __dirname, __filename, module, exports, eval, Function`.

**Timeouts** (from `src/lib/constants/function-registry.ts`):

| Function kind       | Timeout |
| ------------------- | ------- |
| `generate`          | 45 s    |
| `validate`          | 5 s     |
| `meetsRequirements` | 3 s     |
| `getSave`           | 3 s     |

`setTimeout` inside the sandbox is clamped to 1–45000 ms.

## Dynamic action IDs

Any `actionId` containing `#` is resolved by taking the last `#`-separated segment. So `"GENERATED#1#search_0"` and `"GENERATED#42#search_0"` both resolve to the step with `action_id: "search_0"`. Applies to all `run*` methods — useful when the same step repeats inside a flow.

## Session data extraction

Each step declares a `saveData` map of JSONPath expressions applied to the prior response payload. The compiled values land on `sessionData` for subsequent steps.

```typescript
saveData: {
	providerId:          "$.message.catalog.providers[0].id",
	"APPEND#providerIds": "$.message.catalog.providers[*].id",  // concat into array
	customValue:         "EVAL#<base64 of extractor>",           // custom extractor
}
```

- `APPEND#key` — concatenates the JSONPath result into an existing array under `key` instead of overwriting.
- `EVAL#<base64>` — runs a sandboxed `getSave(payload)` function and stores its return value.
- Form steps (`dynamic_form`, `html_form`) auto-save under `sessionData.formData[action_id]` and also set `sessionData[action_id]` to the submission ID.

## Form steps

Supported `api` values for forms: `dynamic_form`, `html_form`, `HTML_FORM_MULTI`, `FORM`.

`force_proceed: true` on a step means "don't wait for user input". `convertToFlowConfig` sets this automatically when the previous step is a form step and the current step has no inputs.

## Config builders

From `@ondc/automation-mock-runner` (via `configHelper.ts`):

- `createInitialMockConfig(domain, version, flowId)` — scaffold with `DEFAULT_HELPER_LIB` pre-installed as `helperLib`.
- `generatePlaygroundConfigFromFlowConfig(payloads, flowConfig)` — reverse: seed a playground config from real ONDC traffic.
- `generatePlaygroundConfigFromFlowConfigWithMeta(payloads, flowConfig, domain, version)` — same, with explicit meta (useful when payloads are empty).
- `convertToFlowConfig(config)` — export a playground config to a Flow sequence.
- `createOptimizedMockConfig(config)` — Terser-minify each step's `generate` / `validate` / `requirements`.
- `validateConfigForDeployment(config)` — stricter pre-publish check (throws on problems).

## Error handling

Every `run*` method returns an `ExecutionResult`:

```typescript
const res = await runner.runGeneratePayload("search_0");
if (!res.success) {
	console.log(res.error.name, res.error.message);
	console.log(res.logs); // captured console output
	console.log(res.executionTime, "ms");
}
```

Common error names: `ActionNotFoundError`, `SessionDataError`, `ConfigurationError`, `PayloadGenerationError`, `PayloadValidationError`, `MeetRequirementsError`.

## FAQ / common gotchas

**`DataCloneError: #<Promise> could not be cloned`** — your `generate` returned a payload containing an un-awaited Promise. Make `generate` `async` and `await` any async helper (including `generateConsentHandler`) before returning. Nested Promises inside the payload are not auto-flattened.

**`fetch blocked: <url> is not in the configured allowlist`** — add the origin+path to `MockRunner.initSharedRunner({ allowedFetchBaseUrls: [...] })`.

**`fetch is not defined`** — you're calling it from `validate`, `meetsRequirements`, or `getSave`. Only `generate` gets `fetch`.

**Helper references `sessionData` but throws `ReferenceError`** — take `sessionData` as an explicit first parameter. Helpers don't share scope with `generate`.

**Edited `default-helpers.js` but the bundle didn't change** — run `npm run helpers:gen` (or `npm test` / `npm run build` — both regen automatically).

**`validationLib` is not injected** — the field exists in the schema but is not currently prepended to any function at execution time. Treat as reserved.

**Execution timed out** — see the timeout table above. `generate` has the largest window (45 s) specifically for delayed-response mocking.

## Testing

```bash
npm test              # full suite (regens helpers via pretest)
npm run test:watch
npm run test:coverage
npm run test:browser-mock   # BrowserRunner / CrossEnvironment tests only
```

## Security notes

- Base64 encoding prevents casual injection via config files.
- The sandbox blocks `eval`, `Function`, `require`, `process`, `Buffer`, filesystem, and (by default) network.
- Network access is per-installer opt-in and path-scoped.
- Redirects are refused to prevent allowlist bypass.
- Workers are recycled after 100 executions / 10 min to limit memory creep in the V8 isolate.

## Contributing

1. `npm test` — all tests green.
2. `npm run lint` / `npm run format` — code style.
3. `npm run type-check` — no TypeScript errors.
4. Add tests for new features; update README when public API changes.

## License

ISC — see LICENSE.

## Support

ONDC-specific questions: [ondc.org](https://ondc.org/). Library issues: file on the repository.
