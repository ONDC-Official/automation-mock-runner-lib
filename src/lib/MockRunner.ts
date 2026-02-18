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
import {
	getDefaultForm,
	getFunctionSchema,
} from "./constants/function-registry";
import { ExecutionResult } from "./types/execution-results";
import { v4 as uuidv4 } from "uuid";

export class MockRunner {
	private config: MockPlaygroundConfigType;
	private runner: BaseCodeRunner | undefined;
	public logger: Logger;

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
		this.logger.debug("Getting code runner instance");
		if (!this.runner) {
			this.runner = RunnerFactory.createRunner({}, this.logger);
		}
		this.logger.debug(
			"Code runner instance obtained successfully: " + this.runner.toString(),
		);
		return this.runner;
	}

	public getConfig() {
		return this.config;
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
			const sessionData = await this.getSessionDataUpToStep(index);

			// Validate inputs against schema if provided
			if (step.mock.inputs?.jsonSchema && Object.keys(inputs).length > 0) {
				// TODO: Add JSON schema validation for inputs
				this.logger.debug("Input validation needed", {
					actionId,
					inputSchema: step.mock.inputs.jsonSchema,
				});
			}
			if (Object.keys(inputs).length > 0) {
				sessionData.user_inputs = inputs;
			}
			const context = this.generateContext(step.action_id, step.api);
			defaultPayload.context = context;

			const schema = getFunctionSchema("generate");

			const code = MockRunner.decodeBase64(step.mock.generate);
			let helperLib = "";
			try {
				helperLib = MockRunner.decodeBase64(this.config.helperLib || "");
			} catch (e) {
				this.logger.error(
					"Failed to decode helper library",
					{ actionId },
					e as Error,
				);
				helperLib = "";
			}

			// Combine helper library and main code
			const fullCode = helperLib + "\n" + code;

			const result = await this.getRunnerInstance().execute(fullCode, schema, [
				defaultPayload,
				sessionData,
			]);

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

	public async runGeneratePayloadWithSession(
		actionId: string,
		sessionData: any,
	) {
		const executionId = this.logger.createExecutionContext(actionId);
		const startTime = Date.now();
		try {
			this.logger.logExecution(
				executionId,
				"Starting payload generation with session data",
				{
					actionId,
					sessionKeys: Object.keys(sessionData),
				},
			);

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

			const context = this.generateContext(
				step.action_id,
				step.api,
				sessionData,
			);
			defaultPayload.context = context;
			const schema = getFunctionSchema("generate");

			const code = MockRunner.decodeBase64(step.mock.generate);
			let helperLib = "";
			try {
				helperLib = MockRunner.decodeBase64(this.config.helperLib || "");
			} catch (e) {
				this.logger.error(
					"Failed to decode helper library",
					{ actionId },
					e as Error,
				);
				helperLib = "";
			}

			// Combine helper library and main code
			const fullCode = helperLib + "\n" + code;

			const result = await this.getRunnerInstance().execute(fullCode, schema, [
				defaultPayload,
				sessionData,
			]);

			const executionTime = Date.now() - startTime;
			this.logger.logExecution(
				executionId,
				"Payload generation with session data completed",
				{
					actionId,
					success: result.success,
					output: result.result,
					executionTime,
				},
			);

			return result;
		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.logger.error(
				"Payload generation with session data failed",
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
			const sessionData = await this.getSessionDataUpToStep(index);

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

	public async runValidatePayloadWithSession(
		actionId: string,
		targetPayload: any,
		sessionData: any,
	) {
		try {
			const step = this.config.steps.find((s) => s.action_id === actionId);
			if (!step) {
				throw new Error(`Action step with ID ${actionId} not found.`);
			}
			const schema = getFunctionSchema("validate");

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

	public async runMeetRequirements(actionId: string) {
		try {
			const step = this.config.steps.find((s) => s.action_id === actionId);
			if (!step) {
				throw new Error(`Action step with ID ${actionId} not found.`);
			}
			const index = this.config.steps.findIndex(
				(s) => s.action_id === actionId,
			);
			const schema = getFunctionSchema("meetsRequirements");
			const sessionData = await this.getSessionDataUpToStep(index);

			const result = await this.getRunnerInstance().execute(
				MockRunner.decodeBase64(step.mock.requirements),
				schema,
				[sessionData],
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

	public async runMeetRequirementsWithSession(
		actionId: string,
		sessionData: any,
	) {
		try {
			const step = this.config.steps.find((s) => s.action_id === actionId);
			if (!step) {
				throw new Error(`Action step with ID ${actionId} not found.`);
			}
			const schema = getFunctionSchema("meetsRequirements");

			const result = await this.getRunnerInstance().execute(
				MockRunner.decodeBase64(step.mock.requirements),
				schema,
				[sessionData],
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
		formType?: "dynamic_form" | "html_form",
	): MockPlaygroundConfigType["steps"][0] {
		if (formType === "html_form") {
			throw new Error("HTML form generation is not implemented yet");
		}
		if (formType === "dynamic_form") {
			return {
				api: api,
				action_id: actionId,
				owner: "BPP",
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
					defaultPayload: {},
					saveData: {},
					inputs: {},
					formHtml: MockRunner.encodeBase64(getDefaultForm()),
				},
			};
		}
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
					transactionId: "$.context.transaction_id",
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
	public generateContext(actionId: string, action: string, sessionData?: any) {
		// Find the step configuration for this action
		const step = this.config.steps.find((s) => s.action_id === actionId);

		// Determine the message_id based on responseFor logic
		let messageId = uuidv4();

		if (step?.responseFor) {
			// Priority 1: Get from sessionData if available
			if (
				sessionData?.latestMessage_id &&
				Array.isArray(sessionData.latestMessage_id) &&
				sessionData.latestMessage_id.length > 0
			) {
				messageId = sessionData.latestMessage_id[0];
			}
			// Priority 2: Fall back to transaction history
			else {
				const historyItem = this.config.transaction_history?.find(
					(item) => item.action_id === step.responseFor,
				);

				if (historyItem?.payload?.context?.message_id) {
					messageId = historyItem.payload.context.message_id;
				}
			}
		}

		// Safely extract transaction_id
		const transactionId = (() => {
			// Priority 1: Get from sessionData
			if (sessionData?.transaction_id) {
				const sessionTxnId = Array.isArray(sessionData.transaction_id)
					? sessionData.transaction_id[0]
					: sessionData.transaction_id;

				// Only return if we got a valid non-empty value
				if (sessionTxnId && sessionTxnId.trim().length > 0) {
					return sessionTxnId;
				}
			}

			// Priority 2: Get from transaction history (most recent)
			if (this.config.transaction_history?.length > 0) {
				const mostRecentHistory =
					this.config.transaction_history[
						this.config.transaction_history.length - 1
					];

				const historyTxnId =
					mostRecentHistory?.payload?.context?.transaction_id;
				if (historyTxnId && historyTxnId.trim().length > 0) {
					return historyTxnId;
				}
			}

			// Priority 3: Get from transaction_data
			const configTxnId = this.config.transaction_data?.transaction_id;
			if (configTxnId && configTxnId.trim().length > 0) {
				return configTxnId;
			}

			// Priority 4: Generate new UUID as last resort
			return uuidv4();
		})();

		const bapId =
			MockRunner.getIdFromSession(sessionData, "bapId") ||
			this.config.transaction_data?.bap_id ||
			"";
		const bppId =
			MockRunner.getIdFromSession(sessionData, "bppId") ||
			this.config.transaction_data?.bpp_id ||
			"";
		const bapUri =
			MockRunner.getIdFromSession(sessionData, "bapUri") ||
			this.config.transaction_data?.bap_uri ||
			"";
		const bppUri =
			MockRunner.getIdFromSession(sessionData, "bppUri") ||
			this.config.transaction_data?.bpp_uri ||
			"";

		// Build base context
		const baseContext: any = {
			domain: this.config.meta?.domain || "",
			action: action,
			timestamp: new Date().toISOString(),
			transaction_id: transactionId,
			message_id: messageId,
			bap_id: bapId,
			bap_uri: bapUri,
			ttl: "PT30S",
		};

		// Add BPP details for non-search actions
		if (action !== "search") {
			baseContext.bpp_id = bppId;
			baseContext.bpp_uri = bppUri;
		}

		// Version-specific context structure
		const version = this.config.meta?.version || "2.0.0";
		const majorVersion = parseInt(version.split(".")[0], 10);

		if (majorVersion === 1) {
			return {
				...baseContext,
				country: "IND",
				city: "*",
				core_version: version,
			};
		}

		// Version 2+ format
		return {
			...baseContext,
			version: version,
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
	public async getSessionDataUpToStep(
		index: number,
	): Promise<Record<string, any>> {
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

			if (
				histItem.action === "dynamic_form" ||
				histItem.action === "html_form"
			) {
				if (!sessionData.formData) {
					sessionData.formData = {};
				}
				sessionData.formData[histItem.action_id] = histItem.payload;
				sessionData[histItem.action_id] =
					histItem.saved_info?.submissionId ?? uuidv4();
				continue;
			}

			const saveData = config.steps[i]?.mock.saveData ?? {};

			for (const key in saveData) {
				const path = saveData[key];
				const isAppend = key.startsWith("APPEND#");
				const isEval = path.startsWith("EVAL#");
				const evalExpression = isEval ? path.split("#")[1] : undefined;
				const actualKey = isAppend ? key.split("#")[1] : key;
				const actualPath = isEval ? path.split("#")[1] : path;
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

					const values = evalExpression
						? (await MockRunner.runGetSave(histItem.payload, evalExpression))
								.result
						: jsonpath.query(histItem.payload, actualPath);

					if (values !== undefined) {
						sessionData[actualKey] = isAppend
							? (sessionData[actualKey] || []).concat(values)
							: values;

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
						sessionData[actualKey] = null;
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

	public static async runGetSave(payload: any, expression: string) {
		const evalExpression = MockRunner.decodeBase64(expression);
		const runner = RunnerFactory.createRunner();
		const schema = getFunctionSchema("getSave");
		return await runner.execute(evalExpression, schema, [payload]);
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

	private static getIdFromSession(
		sessionData: any,
		key: string,
	): string | undefined {
		if (sessionData === undefined) {
			return undefined;
		}
		const data = sessionData[key];
		if (Array.isArray(data) && data.length > 0) {
			return data[0];
		}
		if (typeof data === "string") {
			return data;
		}
		return undefined;
	}
}
