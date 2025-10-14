import { BaseCodeRunner } from "./runners/base-runner";
import { RunnerFactory } from "./runners/runner-factory";
import { MockPlaygroundConfigType } from "./types/mock-config";
import { validateConfigWithErrors } from "./utils/validateConfig";
import { Logger } from "./utils/logger";
import {
	ActionNotFoundError,
	SessionDataError,
	ConfigurationError,
} from "./utils/errors";
import jsonpath from "jsonpath";
import { getFunctionSchema } from "./constants/function-registry";
import { ExecutionResult } from "./types/execution-results";
import { v4 as uuidv4 } from "uuid";

export class MockRunner {
	private config: MockPlaygroundConfigType;
	private runner: BaseCodeRunner | undefined;
	private logger: Logger;

	constructor(
		config: MockPlaygroundConfigType,
		skipValidation: boolean = false,
	) {
		this.logger = Logger.getInstance();

		if (!skipValidation) {
			// Validate config on construction
			const validation = validateConfigWithErrors(config);
			if (!validation.success) {
				const errorMessages =
					validation.errors?.map(
						(err) => `${err.path.join(".")}: ${err.message}`,
					) || [];
				this.logger.error("Invalid configuration provided", {
					errors: errorMessages,
				});
				throw new ConfigurationError(
					`Configuration validation failed: ${errorMessages.join(", ")}`,
					{ errors: errorMessages },
				);
			}
		} else {
			this.logger.warn("Skipping configuration validation as per request");
		}
		this.config = config;

		this.logger.info("MockRunner initialized successfully", {
			domain: config.meta.domain,
			version: config.meta.version,
			flowId: config.meta.flowId,
			stepsCount: config.steps.length,
		});
	}

	public getRunnerInstance() {
		if (!this.runner) {
			this.runner = RunnerFactory.createRunner();
		}
		return this.runner;
	}

	public validateConfig() {
		const res = validateConfigWithErrors(this.config);
		return res;
	}
	public async runGeneratePayload(
		actionId: string,
		inputs: any = {},
	): Promise<ExecutionResult> {
		const executionId = this.logger.createExecutionContext(actionId);
		const startTime = Date.now();

		try {
			this.logger.logExecution(executionId, "Starting payload generation", {
				actionId,
				inputKeys: Object.keys(inputs),
			});

			const step = this.config.steps.find((s) => s.action_id === actionId);
			if (!step) {
				const availableActions = this.config.steps.map((s) => s.action_id);
				throw new ActionNotFoundError(actionId, availableActions);
			}

			const index = this.config.steps.findIndex(
				(s) => s.action_id === actionId,
			);

			// Deep clone to avoid mutations
			const defaultPayload = JSON.parse(
				JSON.stringify(step.mock.defaultPayload),
			);
			const sessionData = this.getSessionDataUpToStep(index);

			// Validate inputs against schema if provided
			if (step.mock.inputs?.jsonSchema && Object.keys(inputs).length > 0) {
				// TODO: Add JSON schema validation for inputs
				this.logger.debug("Input validation needed", {
					actionId,
					inputSchema: step.mock.inputs.jsonSchema,
				});
			}

			sessionData.user_inputs = inputs;
			const context = this.generateContext(step.action_id, step.api);
			defaultPayload.context = context;

			const schema = getFunctionSchema("generate");

			const result = await this.getRunnerInstance().execute(
				MockRunner.decodeBase64(step.mock.generate),
				schema,
				[defaultPayload, sessionData],
			);

			const executionTime = Date.now() - startTime;
			this.logger.logExecution(executionId, "Payload generation completed", {
				actionId,
				success: result.success,
				output: result.result,
				executionTime,
			});

			return result;
		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.logger.error(
				"Payload generation failed",
				{ actionId, executionTime },
				error as Error,
			);

			return {
				timestamp: new Date().toISOString(),
				success: false,
				error: {
					name:
						error instanceof Error
							? error.constructor.name
							: "PayloadGenerationError",
					message: (error as Error).message || "Unknown error",
				},
				logs: [],
				executionTime,
				validation: { isValid: false, errors: [], warnings: [] },
			};
		}
	}
	public async runValidatePayload(
		actionId: string,
		targetPayload: any,
	): Promise<ExecutionResult> {
		try {
			const step = this.config.steps.find((s) => s.action_id === actionId);
			if (!step) {
				throw new Error(`Action step with ID ${actionId} not found.`);
			}
			const index = this.config.steps.findIndex(
				(s) => s.action_id === actionId,
			);
			const schema = getFunctionSchema("validate");
			const sessionData = this.getSessionDataUpToStep(index);

			const result = await this.getRunnerInstance().execute(
				MockRunner.decodeBase64(step.mock.validate),
				schema,
				[targetPayload, sessionData],
			);
			return result;
		} catch (error) {
			return {
				timestamp: new Date().toISOString(),
				success: false,
				error: {
					name: "PayloadValidationError",
					message: (error as Error).message || "Unknown error",
				},
				logs: [],
				executionTime: 0,
				validation: { isValid: false, errors: [], warnings: [] },
			};
		}
	}
	public async runMeetRequirements(actionId: string, targetPayload: any) {
		try {
			const step = this.config.steps.find((s) => s.action_id === actionId);
			if (!step) {
				throw new Error(`Action step with ID ${actionId} not found.`);
			}
			const index = this.config.steps.findIndex(
				(s) => s.action_id === actionId,
			);
			const schema = getFunctionSchema("meetsRequirements");
			const sessionData = this.getSessionDataUpToStep(index);

			const result = await this.getRunnerInstance().execute(
				MockRunner.decodeBase64(step.mock.requirements),
				schema,
				[targetPayload, sessionData],
			);
			return result;
		} catch (error) {
			return {
				timestamp: new Date().toISOString(),
				success: false,
				error: {
					name: "MeetRequirementsError",
					message: (error as Error).message || "Unknown error",
				},
				logs: [],
				executionTime: 0,
				validation: { isValid: false, errors: [], warnings: [] },
			};
		}
	}
	public getDefaultStep(
		api: string,
		actionId: string,
	): MockPlaygroundConfigType["steps"][0] {
		return {
			api: api,
			action_id: actionId,
			owner: api.startsWith("on_") ? "BPP" : "BAP",
			responseFor: null,
			unsolicited: false,
			description: "please add relevant description",
			mock: {
				generate: MockRunner.encodeBase64(
					getFunctionSchema("generate").template(
						getFunctionSchema("generate").defaultBody,
					),
				),
				validate: MockRunner.encodeBase64(
					getFunctionSchema("validate").template(
						getFunctionSchema("validate").defaultBody,
					),
				),
				requirements: MockRunner.encodeBase64(
					getFunctionSchema("meetsRequirements").template(
						getFunctionSchema("meetsRequirements").defaultBody,
					),
				),
				defaultPayload: {
					context: this.generateContext(actionId, api),
					message: {},
				},
				saveData: {
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
				},
				inputs: {
					id: "ExampleInputId",
					jsonSchema: {
						$schema: "http://json-schema.org/draft-07/schema#",
						type: "object",
						properties: {
							email: {
								type: "string",
								format: "email",
								minLength: 5,
								maxLength: 50,
								description: "User's email address",
							},
							age: {
								type: "integer",
								minimum: 18,
								maximum: 120,
								description: "User's age",
							},
							password: {
								type: "string",
								minLength: 8,
								pattern: "^(?=.*[A-Z])(?=.*[0-9]).+$",
								description: "Must contain uppercase and number",
							},
							website: {
								type: "string",
								format: "uri",
							},
							country: {
								type: "string",
								enum: ["US", "UK", "CA", "AU"],
							},
						},
						required: ["email", "password"],
						additionalProperties: false,
					},
				},
			},
		};
	}
	public generateContext(actionId: string, action: string) {
		let step = this.config.steps.find((s) => s.action_id === actionId);
		if (!step) {
			step = undefined;
		}
		const responseFor = step?.responseFor;
		let messageId = uuidv4();
		if (responseFor) {
			const responsePayload = this.config.transaction_history.find(
				(item) => item.action_id === responseFor,
			)?.payload;
			if (responsePayload.context?.message_id) {
				messageId = responsePayload.context.message_id;
			}
		}
		const baseContext: any = {
			domain: this.config.meta.domain,
			action: action,
			timestamp: new Date().toISOString(),
			transaction_id: this.config.transaction_data.transaction_id,
			message_id: messageId,
			bap_id: this.config.transaction_data.bap_id || "",
			bap_uri: this.config.transaction_data.bap_uri || "",
			ttl: "PT30S",
		};
		if (action != "search") {
			baseContext.bpp_id = this.config.transaction_data.bpp_id || "";
			baseContext.bpp_uri = this.config.transaction_data.bpp_uri || "";
		}

		if (this.config.meta.version.split(".")[0] === "1") {
			return {
				...baseContext,
				country: "IND",
				city: "*",
				core_version: this.config.meta.version,
			};
		}
		return {
			...baseContext,
			version: this.config.meta.version,
			location: {
				country: {
					code: "IND",
				},
				city: {
					code: "*",
				},
			},
		};
	}
	public getSessionDataUpToStep(index: number): Record<string, any> {
		const config = this.config;
		if (index < 0 || index > config.steps.length) {
			this.logger.warn("Invalid step index for session data", {
				index,
				maxSteps: config.steps.length,
			});
			return {};
		}

		if (config.transaction_history.length < index) {
			this.logger.error("Insufficient transaction history", {
				historyLength: config.transaction_history.length,
				requiredIndex: index,
			});
			throw new SessionDataError(
				`Transaction history length (${config.transaction_history.length}) is less than step index (${index})`,
				index,
			);
		}

		const sessionData: Record<string, any> = {};

		for (let i = 0; i < index; i++) {
			const histItem = config.transaction_history[i] ?? {
				payload: {},
			};
			const saveData = config.steps[i]?.mock.saveData ?? {};

			for (const key in saveData) {
				const path = saveData[key];

				try {
					// Validate JSONPath expression
					if (!path || typeof path !== "string") {
						this.logger.warn("Invalid JSONPath expression", {
							step: i,
							key,
							path,
						});
						continue;
					}

					const values = jsonpath.query(histItem.payload, path);
					const value = values[0];

					if (value !== undefined) {
						sessionData[key] = value;
						this.logger.debug("Session data extracted", {
							step: i,
							key,
							path,
							hasValue: true,
						});
					} else {
						this.logger.debug("No value found for JSONPath", {
							step: i,
							key,
							path,
						});
						sessionData[key] = null;
					}
				} catch (error) {
					this.logger.error(
						"JSONPath query failed",
						{ step: i, key, path },
						error as Error,
					);
					throw new SessionDataError(
						`Failed to extract session data at step ${i}, key '${key}' with path '${path}': ${(error as Error).message}`,
						i,
						path,
					);
				}
			}
		}

		this.logger.debug("Session data compiled", {
			stepIndex: index,
			keysExtracted: Object.keys(sessionData),
		});

		return sessionData;
	}

	public static encodeBase64(input: string): string {
		const bytes = new TextEncoder().encode(input);
		return btoa(String.fromCharCode(...bytes));
	}
	public static decodeBase64(encoded: string): string {
		const binaryString = atob(encoded);
		const bytes = new Uint8Array(
			[...binaryString].map((char) => char.charCodeAt(0)),
		);
		return new TextDecoder().decode(bytes);
	}
}
