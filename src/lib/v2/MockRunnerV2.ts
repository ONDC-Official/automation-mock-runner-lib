import { BaseCodeRunner } from "../runners/base-runner";
import { RunnerFactory, RunnerOptions } from "../runners/runner-factory";
import * as base64 from "../utils/base64";
import { ConfigurationError } from "../utils/errors";
import { Logger } from "../utils/logger";
import { MockPlaygroundConfigV2Type } from "./types";
import { validateConfigV2WithErrors } from "./validateConfig";

/**
 * Runner for v2 configs, the Protocol Studio format (many flows in one config).
 *
 * A separate class from `MockRunner` so v1 behaviour can never be affected.
 * Step execution is added once the v2 flow graph schema is defined.
 *
 * @experimental
 */
export class MockRunnerV2 {
	private config: MockPlaygroundConfigV2Type;
	private static sharedRunner: BaseCodeRunner | undefined;
	public logger: Logger;

	private static getSharedRunner(logger?: Logger): BaseCodeRunner {
		if (!MockRunnerV2.sharedRunner) {
			MockRunnerV2.sharedRunner = RunnerFactory.createRunner({}, logger);
		}
		return MockRunnerV2.sharedRunner;
	}

	/**
	 * Initialize (or replace) the shared v2 runner with explicit options. This
	 * pool is separate from `MockRunner`'s, so configure both if you use both.
	 */
	public static initSharedRunner(options: RunnerOptions = {}): BaseCodeRunner {
		const logger = Logger.getInstance();
		if (MockRunnerV2.sharedRunner) {
			logger.warn("Replacing existing shared v2 runner");
			try {
				MockRunnerV2.sharedRunner.terminate();
			} catch (e) {
				logger.error(
					"Failed to terminate previous shared v2 runner",
					{},
					e as Error,
				);
			}
		}
		MockRunnerV2.sharedRunner = RunnerFactory.createRunner(options, logger);
		return MockRunnerV2.sharedRunner;
	}

	constructor(
		config: MockPlaygroundConfigV2Type,
		skipValidation: boolean = false,
	) {
		this.logger = Logger.getInstance();

		if (!skipValidation) {
			const validation = validateConfigV2WithErrors(config);
			if (!validation.success) {
				const errorMessages =
					validation.errors?.map(
						(err) => `${err.path.join(".")}: ${err.message}`,
					) || [];
				this.logger.error("Invalid v2 configuration provided", {
					errors: errorMessages,
				});
				throw new ConfigurationError(
					`Configuration validation failed: ${errorMessages.join(", ")}`,
					{ errors: errorMessages },
				);
			}
		} else {
			this.logger.warn("Skipping v2 configuration validation as per request");
		}
		this.config = config;

		this.logger.info("MockRunnerV2 initialized successfully", {
			domain: config.meta?.domain,
			version: config.meta?.version,
		});
	}

	public getRunnerInstance() {
		return MockRunnerV2.getSharedRunner(this.logger);
	}

	public getConfig() {
		return this.config;
	}

	public validateConfig() {
		return validateConfigV2WithErrors(this.config);
	}

	public static encodeBase64(input: string): string {
		return base64.encode(input);
	}

	public static decodeBase64(encoded: string): string {
		return base64.decode(encoded);
	}
}
