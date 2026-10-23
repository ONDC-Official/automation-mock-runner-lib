/**
 * What step code can use besides the ES2020 built-ins, as global declarations
 * for an editor (TypeScript `lib: ["es2020"]`, no DOM). Mirrors the sandbox in
 * `public/node-worker.js` and `worker/worker-factory.ts`: a console, clamped
 * timers, `AbortController`, and `fetch`, which only `generate` gets at runtime.
 *
 * @experimental
 */
export const SANDBOX_GLOBALS_DTS_V2 = `// Step code sandbox: what runs besides the ES2020 built-ins.

/** What validate and meetsRequirements return. \`valid: false\` rejects or holds the step. */
interface StepCheckResult {
    valid: boolean;
    code: number;
    description: string;
}

declare const console: {
    log(...data: any[]): void;
    info(...data: any[]): void;
    warn(...data: any[]): void;
    error(...data: any[]): void;
    debug(...data: any[]): void;
};

/** Delay must be 1-45000 ms. */
declare function setTimeout(handler: (...args: any[]) => void, delay: number): any;
declare function clearTimeout(id: any): void;

interface AbortSignal {
    readonly aborted: boolean;
    readonly reason: any;
}
declare const AbortSignal: { timeout(ms: number): AbortSignal };
declare class AbortController {
    readonly signal: AbortSignal;
    abort(reason?: any): void;
}

interface FetchResponse {
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly headers: { get(name: string): string | null };
    json(): Promise<any>;
    text(): Promise<string>;
}

/**
 * Outbound HTTP. Only available inside \`generate\`, and only to allowlisted hosts;
 * \`validate\` and \`meetsRequirements\` must stay pure.
 */
declare function fetch(
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }
): Promise<FetchResponse>;
`;
