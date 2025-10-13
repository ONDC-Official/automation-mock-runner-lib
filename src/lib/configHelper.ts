import { MockPlaygroundConfigType } from "./types/mock-config";
import { v4 as uuidv4 } from "uuid";
export function createInitialMockConfig(
	domain: string,
	version: string,
	flowId: string
): MockPlaygroundConfigType {
	return {
		meta: {
			domain,
			version,
			flowId,
		},
		transaction_data: {
			transaction_id: uuidv4(),
			latest_timestamp: new Date(0).toISOString(),
			bap_id: "sample-bap-id",
			bap_uri: "https://bap.example.com",
			bpp_id: "sample-bpp-id",
			bpp_uri: "https://bpp.example.com",
		},
		steps: [],
		transaction_history: [],
		validationLib: "",
		helperLib: "",
	};
}

// export function getDefaultStep(
// 	action: string,
// 	action_id: string,
// 	owner: "BAP" | "BPP",
// 	responseFor: string | null = null,
// 	unsolicited = false,
// 	config: MockPlaygroundConfigType
// ): MockPlaygroundConfigType["steps"][0] {
// 	return {
// 		api: action,
// 		action_id: action_id,
// 		owner: owner,
// 		responseFor: responseFor,
// 		unsolicited: unsolicited,
// 		description: "",
// 		mock: {
// 			generate: getFormattedContent("generate"),
// 			validate: getFormattedContent("validate"),
// 			requirements: getFormattedContent("requirements"),
// 			defaultPayload: JSON.stringify(
// 				{
// 					context: getnerateContext(config, action, responseFor),
// 					message: {},
// 				},
// 				null,
// 				2
// 			),
// 			saveData: {
// 				message_id: "$.context.message_id",
// 				latestTimestamp: "$.context.timestamp",
// 			},
// 			inputs: JSON.stringify(
// 				{
// 					id: "ExampleInputId",
// 					jsonSchema: {
// 						$schema: "http://json-schema.org/draft-07/schema#",
// 						type: "object",
// 						properties: {
// 							email: {
// 								type: "string",
// 								format: "email",
// 								minLength: 5,
// 								maxLength: 50,
// 								description: "User's email address",
// 							},
// 							age: {
// 								type: "integer",
// 								minimum: 18,
// 								maximum: 120,
// 								description: "User's age",
// 							},
// 							password: {
// 								type: "string",
// 								minLength: 8,
// 								pattern: "^(?=.*[A-Z])(?=.*[0-9]).+$",
// 								description: "Must contain uppercase and number",
// 							},
// 							website: {
// 								type: "string",
// 								format: "uri",
// 							},
// 							country: {
// 								type: "string",
// 								enum: ["US", "UK", "CA", "AU"],
// 							},
// 						},
// 						required: ["email", "password"],
// 						additionalProperties: false,
// 					},
// 				},
// 				null,
// 				2
// 			),
// 		},
// 	};
// }
