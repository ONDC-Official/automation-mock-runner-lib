# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package

`@ondc/automation-mock-runner` — TypeScript library for building/validating ONDC transaction flows. Published to npm; `dist/index.js` is the entry, `dist/index.d.ts` the types. Node `>=16`.

## Commands

```bash
npm test                                    # jest, testMatch = **/*.test.ts
npm run test:watch
npm run test:coverage
npm run test:browser-mock                   # only BrowserRunner / CrossEnvironment tests
npx jest src/test/MockRunner.test.ts        # single file
npx jest -t "substring of test name"        # single test

npm run lint          # eslint --fix on src/**/*.ts
npm run lint:check    # no --fix (what CI runs)
npm run format        # prettier write
npm run format:check
npm run type-check    # tsc --noEmit
npm run validate      # type-check + lint:check + format:check

npm run build         # clean + tsc → dist/
npm run build:watch
```

Release: `npm run release:patch|minor|major` (version bump + publish, triggers `prepublishOnly` → test + build).

## Architecture

Library turns a **base64-encoded JS config** into an executable ONDC flow. Each step contains three user functions (`generate`, `validate`, `meetsRequirements`) that run inside a sandbox.

### Execution path

`MockRunner` (`src/lib/MockRunner.ts`) is the only public entry point most callers need. On each `runGeneratePayload` / `runValidatePayload` / `runMeetRequirements` call:

1. Resolve `actionId` → `baseActionId` via `resolveBaseActionId` (splits on `#`, takes last segment — IDs like `GENERATED#1#search` are legal).
2. Build `sessionData` from `transaction_history` using each prior step's `saveData` JSONPath map (`getSessionDataUpToStep`). Special prefixes:
   - `APPEND#key` → concat into array instead of overwrite.
   - `EVAL#<base64>` → run custom extractor via `runGetSave` instead of JSONPath.
   - Form steps (`dynamic_form`, `html_form`) store payload under `sessionData.formData[action_id]`.
3. Generate `context` via `generateContext` — version-aware (v1 uses `country`/`city`/`core_version` flat; v2 uses nested `location.city.code`). Message ID honors `responseFor` (pulls from session's `latestMessage_id`, falls back to `transaction_history`).
4. Decode base64 function + prepend decoded `helperLib`, hand off to a pooled runner.

### Runners

`RunnerFactory` (`src/lib/runners/runner-factory.ts`) detects environment and returns:

- **`NodeRunner`** (`node-runner.ts`): pool of `worker_threads` Workers. Pool size 2, each worker recycled after 100 executions or 10 min (prevents V8 isolate memory creep). The worker loads **`public/node-worker.js`** via `path.join(__dirname, "../../../public/node-worker.js")` — that relative path is load-bearing: `public/` ships as a top-level package file (see `package.json#files`) and must resolve from `dist/lib/runners/`. If you move files, update the path.
- **`BrowserRunner`** (`browser-runner.ts`): single Web Worker created inline from `WorkerFactory` in `src/lib/worker/worker-factory.ts`.

Both runners go through `CodeValidator.validate` (`src/lib/validators/code-validator.ts`) before execution — acorn AST walk rejects `eval`, `Function`, `fetch`, `XMLHttpRequest`, `Worker`, `__proto__`, `while(true)`, `for(;;)`, `with`, etc. Note: despite the parameter name `functionBody`, the validator expects a **complete function declaration** (it parses as-is, doesn't wrap).

The Node worker builds a fresh `vm.createContext` sandbox per execution with a whitelist of globals (`Array`, `JSON`, `Math`, `Promise`, …); `require`, `process`, `Buffer`, `eval`, `Function` are all explicitly `undefined`. `setTimeout` is clamped to 1–35000 ms.

### Config & validation

Zod schemas in `src/lib/types/mock-config.ts` define the canonical shape. `MockPlaygroundConfigType` is the top-level type. `MockRunner` constructor validates the config unless `skipValidation: true` is passed (logs a warning). `validateGoodConfig` (`src/lib/utils/validateConfig.ts`) is the stricter deployment-time check — used by `validateConfigForDeployment` in `configHelper.ts`.

Functions must be **base64**. Use `MockRunner.encodeBase64(src)` / `decodeBase64` (the class statics are the sanctioned helpers — they use `TextEncoder`/`TextDecoder`, not `Buffer`, so they work in both environments).

### Function registry

`src/lib/constants/function-registry.ts` defines the four function kinds (`generate`, `validate`, `meetsRequirements`, `getSave`) — each has signature, timeout (generate: 35s, validate: 5s, meetsRequirements: 3s, getSave: 3s), a default body, and a JSDoc template used by `getDefaultStep`. When adding a new function kind, register it here; the runner looks up schema by name.

### configHelper

`src/lib/configHelper.ts` has the higher-level builders:

- `createInitialMockConfig(domain, version, flowId)` — scaffold with default `helperLib` (a set of JS helpers: `uuidv4`, `currentTimestamp`, `isoDurToSec`, `setCityFromInputs`, `createFormURL`, `generate6DigitId`) that get prepended to every `generate`.
- `convertToFlowConfig(config)` — export Playground config → Flow sequence (used by flow builder UIs).
- `generatePlaygroundConfigFromFlowConfig(payloads, flowConfig)` — reverse direction, seeding step payloads from real ONDC traffic.
- `createOptimizedMockConfig` / `getMinifiedCode` — run Terser on each step's base64 functions before shipping.

## Conventions & gotchas

- `validationLib` is in the schema but **not currently injected** into execution — only `helperLib` is prepended in `runGeneratePayload` / `runGeneratePayloadWithSession`.
- Form step APIs are lowercase (`dynamic_form`, `html_form`); `convertToFlowConfig` also accepts uppercase (`DYNAMIC_FORM`, `HTML_FORM`, `HTML_FORM_MULTI`).
- Tests mock `uuid` via `src/test/__mocks__/uuid.ts` (configured in `jest.config.js` `moduleNameMapper`).
- `src/test/flow-convertsion-test.ts` is **not** picked up by jest (missing `.test.ts` suffix) — it's a scratch script.
- CI (`.github/workflows/ci.yml`): runs lint/type-check/format-check, `npm audit --audit-level high`, tests on Node 16/18/20 × ubuntu/windows/macOS, builds artifact, publishes to npm on `release: published`.
- No console logs in src — eslint rule `no-console: warn`.

## Unresolved questions

- `validationLib` intentionally unused, or missing wiring? Worth asking before changing.
- `flow-convertsion-test.ts` — real test needing rename, or dead scratch file?
