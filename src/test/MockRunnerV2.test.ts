/**
 * Tests for MockRunnerV2 and the v2 (Protocol Studio) config scaffold
 */

import { DEFAULT_HELPER_LIB } from "../lib/helpers";
import { MockRunner } from "../lib/MockRunner";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";
import { ConfigurationError } from "../lib/utils/errors";
import { isPlaygroundV2Config } from "../lib/utils/playground-version";
import {
	createInitialMockConfigV2,
	MockPlaygroundConfigV2Type,
	MockRunnerV2,
	validateConfigV2WithErrors,
} from "../lib/v2";

const v1Config = (): MockPlaygroundConfigType => ({
	meta: {
		domain: "ONDC:TRV14",
		version: "2.0.0",
		flowId: "testing",
	},
	transaction_data: {
		transaction_id: "e9e0b5cb-3f15-48a1-9d86-d4d643f0909d",
		latest_timestamp: "1970-01-01T00:00:00.000Z",
	},
	steps: [],
	transaction_history: [],
	validationLib: "",
	helperLib: "",
});

describe("MockRunnerV2", () => {
	let config: MockPlaygroundConfigV2Type;

	beforeEach(() => {
		config = createInitialMockConfigV2("ONDC:TRV14", "2.0.0");
	});

	afterEach(async () => {
		for (const cls of [MockRunnerV2, MockRunner]) {
			const sharedRunner = (cls as any).sharedRunner;
			if (sharedRunner?.terminate) {
				await sharedRunner.terminate();
			}
			(cls as any).sharedRunner = undefined;
		}
		jest.clearAllMocks();
	});

	describe("createInitialMockConfigV2", () => {
		it("should produce a valid v2 config without a flowId", () => {
			expect(validateConfigV2WithErrors(config).success).toBe(true);
			expect(config.meta.playground_version).toBe("v2");
			expect(config.meta.domain).toBe("ONDC:TRV14");
			expect(config.meta.version).toBe("2.0.0");
			expect(config.meta).not.toHaveProperty("flowId");
		});

		it("should start from the v1 default helper lib and transaction data", () => {
			expect(MockRunnerV2.decodeBase64(config.helperLib)).toBe(
				DEFAULT_HELPER_LIB,
			);
			expect(config.transaction_data.transaction_id).toBeTruthy();
			expect(config.transaction_data.bap_id).toBe("bap.example.com");
		});
	});

	describe("Constructor", () => {
		it("should create MockRunnerV2 with a valid v2 config", () => {
			const runner = new MockRunnerV2(config);
			expect(runner).toBeInstanceOf(MockRunnerV2);
			expect(runner.getConfig()).toBe(config);
			expect(runner.validateConfig().success).toBe(true);
		});

		it("should reject a v1 config", () => {
			expect(() => new MockRunnerV2(v1Config() as any)).toThrow(
				ConfigurationError,
			);
			expect(() => new MockRunnerV2(v1Config() as any)).toThrow(
				/meta\.playground_version/,
			);
		});

		it("should skip validation when requested", () => {
			const runner = new MockRunnerV2(v1Config() as any, true);
			expect(runner.validateConfig().success).toBe(false);
		});
	});

	describe("Shared runner", () => {
		it("should reuse one runner across instances, separate from MockRunner's", () => {
			const a = new MockRunnerV2(config).getRunnerInstance();
			const b = new MockRunnerV2(config).getRunnerInstance();
			expect(a).toBe(b);
			expect(a).not.toBe(new MockRunner(v1Config()).getRunnerInstance());
		});
	});

	describe("Base64", () => {
		it("should round-trip unicode source", () => {
			const src = "function generate() { return '₹ ✓'; }";
			expect(MockRunnerV2.decodeBase64(MockRunnerV2.encodeBase64(src))).toBe(
				src,
			);
		});
	});

	describe("isPlaygroundV2Config", () => {
		it("should identify v2 configs by meta.playground_version", () => {
			expect(isPlaygroundV2Config(config)).toBe(true);
			expect(isPlaygroundV2Config(v1Config())).toBe(false);
			expect(isPlaygroundV2Config(null)).toBe(false);
			expect(isPlaygroundV2Config({})).toBe(false);
			expect(isPlaygroundV2Config({ meta: null })).toBe(false);
		});
	});
});

describe("MockRunner (v1) alongside v2", () => {
	it("should still accept a v1 config, which carries no playground_version", () => {
		const config = v1Config();
		expect(config.meta).not.toHaveProperty("playground_version");
		expect(new MockRunner(config).validateConfig().success).toBe(true);
	});
});
