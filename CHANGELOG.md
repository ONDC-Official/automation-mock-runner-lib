# Changelog

## 1.4.0

Adds v2 configs, the format Protocol Studio edits. Every change is additive: v1 configs, `MockRunner` and every earlier export work as before. Everything new is marked `@experimental`.

### v2 configs

- `MockRunnerV2`, `MockPlaygroundConfigV2Schema` and `createInitialMockConfigV2` hold many flows in one config, flagged with `meta.playground_version: "v2"`.
- `isPlaygroundV2Config` tells the two versions apart. A config without the flag is v1.
- TypeScript step code (compile and typed templates) and spec type generation.
- `FUNCTION_REGISTRY` gains three function kinds:
  - `decide`, for decision nodes;
  - `match`, which recognises an incoming payload;
  - `exit`, for repeat-until nodes.

### Graph executor (`GraphExecutorV2`)

`GraphExecutorV2` runs a flat protocol graph step by step, in Node or the browser.

- **Steps:** each step runs v1's pipeline in v1's sandbox: `meetsRequirements` → `generate` → `validate` → `saveData`.
- **Sessions:** one `transaction_id` per session. Sessions are immutable and rebuilt from their events. Session data and `context` match `MockRunner` exactly.
- **`next()`:** follows one of these:
  - a single successor;
  - a decision's case;
  - a journey's choice, or a fork in open mode.

  It also handles optional skips, repeat limits, on-demand nodes, and start and end marks.

- **Incoming payloads:** `recognise()` and `receive()` take a payload from the counterparty.
- **v1 configs:** `graphFromV1ConfigV2` runs a v1 config as a linear graph.

### Run driver

The driver keeps the rules of a run in one place, so Studio's simulation and the mock service behave the same:

- `createGraphRunV2` and `planV2`.
- `stepV2` and `runUntilV2`, `receiveV2`, `triggerV2`.
- `skipNextV2`, `chooseV2` and `finishV2`.
- `getRunStatusV2` and `hostPlaysV2`.

A run plays `"BAP"`, `"BPP"` or `"both"`. Its state is JSON-serialisable.

- **`settleV2`:** moves a run past the journey's skips and its decisions, without sending anything. A host uses it to learn who opens a journey that starts with a decision.
- **Failure causes:** `RunFailureV2`, `NextV2` and the `failed` plan carry an optional `cause` (`RunFailureCauseV2`):
  - `exit`: a repeat-until node reached `repeat.max` before its exit condition.
  - `repeat`: a decision led back into a node that has already run `repeat.max` times.
  - `no-wire`: a decision returned a case that no wire leads out on.
  - `requirements`: `meetsRequirements` said no in a run that blocks on it.
- **Requirements:** `requirements: "record" | "block"` is available on `DriverOptionsV2`, `RunStepOptionsV2` and `triggerV2`.
  - **When it applies:** `block` is the default when a run plays one side. `record` is the default when it plays both.
  - **What `block` does:** a failing check skips `generate` and sets `StepRunV2.requirementsFailed`. A callback answers with v1's `REQUIREMENTS_NOT_MET` or `REQUIREMENTS_CHECK_ERROR` error payload, recorded as an `ERROR` event. A request sends nothing.
  - **Skipping the check:** `skipRequirements` skips it entirely.

### Live sessions

`LiveGraphConfigV2Schema` and `parseLiveGraphConfigV2` define the graph document a live mock session stores (`PLAYGROUND_V2_<sessionId>`).

### Fixes during the 1.4.0 cycle

- A main-path callback reuses its main-path request's `message_id`. An on-demand run in between no longer takes its place.
- A decision can no longer loop past a node's repeat limit. A decided case without a wire now fails the run, where before it ended the run quietly.
