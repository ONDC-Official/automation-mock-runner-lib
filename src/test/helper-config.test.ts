import {
	createInitialMockConfig,
	convertToFlowConfig,
	generatePlaygroundConfigFromFlowConfig,
} from "../lib/configHelper";
import { MockPlaygroundConfigType } from "../lib/types/mock-config";
import { Flow } from "../lib/types/flow-types";

// Mock UUID to get predictable test results
jest.mock("uuid", () => ({
	v4: jest.fn(() => "test-uuid-1234"),
}));

const testMockConfig: MockPlaygroundConfigType = {
	meta: {
		domain: "ONDC:TRV14",
		version: "2.0.0",
		flowId: "test",
	},
	transaction_data: {
		transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
		latest_timestamp: "1970-01-01T00:00:00.000Z",
		bap_id: "sample-bap-id",
		bap_uri: "https://bap.example.com",
		bpp_id: "sample-bpp-id",
		bpp_uri: "https://bpp.example.com",
	},
	steps: [
		{
			api: "search",
			action_id: "test",
			owner: "BAP",
			responseFor: null,
			unsolicited: false,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICByZXR1cm4gZGVmYXVsdFBheWxvYWQ7Cn0=",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiIiB9Owp9",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						domain: "ONDC:TRV14",
						action: "search",
						timestamp: "2025-10-14T06:46:29.913Z",
						transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
						message_id: "f43510e7-9b7b-4dfe-a449-e6a2f9df86dc",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						version: "2.0.0",
						location: {
							country: {
								code: "IND",
							},
							city: {
								code: "*",
							},
						},
					},
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
				inputs: {},
			},
		},
		{
			api: "on_search",
			action_id: "on_search_test",
			owner: "BPP",
			responseFor: "test",
			unsolicited: false,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICBkZWZhdWx0UGF5bG9hZC5tZXNzYWdlLml0ZW1faWQgPSBzZXNzaW9uRGF0YS51c2VyX2lucHV0cy5pdGVtX2lkOwogIGRlZmF1bHRQYXlsb2FkLm1lc3NhZ2UuaXRlbV9jb3VudCA9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzLml0ZW1fY291bnQ7CiAgcmV0dXJuIGRlZmF1bHRQYXlsb2FkOwp9",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiVmFsaWQgcmVxdWVzdCIgfTsKfQ==",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						domain: "ONDC:TRV14",
						action: "on_search",
						timestamp: "2025-10-14T08:57:21.699Z",
						transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
						message_id: "b70244ad-b3df-4910-96d1-0d04a4a1df5d",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "sample-bpp-id",
						bpp_uri: "https://bpp.example.com",
						version: "2.0.0",
						location: {
							country: {
								code: "IND",
							},
							city: {
								code: "*",
							},
						},
					},
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
							item_id: {
								type: "string",
								description: "item id",
							},
							item_count: {
								type: "integer",
								minimum: 0,
								maximum: 12,
								description: "item count",
							},
							required: ["item_id", "item_count"],
							additionalProperties: false,
						},
					},
				},
			},
		},
		{
			api: "select",
			action_id: "select_1",
			owner: "BAP",
			responseFor: null,
			unsolicited: false,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICByZXR1cm4gZGVmYXVsdFBheWxvYWQ7Cn0=",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiVmFsaWQgcmVxdWVzdCIgfTsKfQ==",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						domain: "ONDC:TRV14",
						action: "select",
						timestamp: "2025-10-14T08:58:23.363Z",
						transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
						message_id: "22b94f0a-6bee-4af6-aafd-e401d4b38bf6",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "sample-bpp-id",
						bpp_uri: "https://bpp.example.com",
						version: "2.0.0",
						location: {
							country: {
								code: "IND",
							},
							city: {
								code: "*",
							},
						},
					},
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
				inputs: {},
			},
		},
		{
			api: "on_select",
			action_id: "on_select_1",
			owner: "BPP",
			responseFor: "select_1",
			unsolicited: false,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICByZXR1cm4gZGVmYXVsdFBheWxvYWQ7Cn0=",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiVmFsaWQgcmVxdWVzdCIgfTsKfQ==",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						domain: "ONDC:TRV14",
						action: "on_select",
						timestamp: "2025-10-14T09:14:46.748Z",
						transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
						message_id: "54b847b2-58e0-4edc-b7bc-801865f14e1f",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "sample-bpp-id",
						bpp_uri: "https://bpp.example.com",
						version: "2.0.0",
						location: {
							country: {
								code: "IND",
							},
							city: {
								code: "*",
							},
						},
					},
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
				inputs: {},
			},
		},
		{
			api: "on_status",
			action_id: "on_status_test",
			owner: "BPP",
			responseFor: null,
			unsolicited: true,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICByZXR1cm4gZGVmYXVsdFBheWxvYWQ7Cn0=",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiVmFsaWQgcmVxdWVzdCIgfTsKfQ==",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						domain: "ONDC:TRV14",
						action: "on_status",
						timestamp: "2025-10-14T09:15:35.787Z",
						transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
						message_id: "81c96976-4635-4755-bb07-50235c21e583",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "sample-bpp-id",
						bpp_uri: "https://bpp.example.com",
						version: "2.0.0",
						location: {
							country: {
								code: "IND",
							},
							city: {
								code: "*",
							},
						},
					},
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
				inputs: {},
			},
		},
	],
	transaction_history: [
		{
			action_id: "test",
			payload: {
				context: {
					domain: "ONDC:TRV14",
					action: "search",
					timestamp: "2025-10-14T08:55:45.145Z",
					transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
					message_id: "519503eb-6437-4d73-82d4-c05345747d73",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					version: "2.0.0",
					location: {
						country: {
							code: "IND",
						},
						city: {
							code: "*",
						},
					},
				},
				message: {},
			},
			saved_info: {},
		},
		{
			action_id: "on_search_test",
			payload: {
				context: {
					domain: "ONDC:TRV14",
					action: "on_search",
					timestamp: "2025-10-14T09:01:18.725Z",
					transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
					message_id: "237884ab-a783-407a-a94e-e854a650ed58",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					bpp_id: "sample-bpp-id",
					bpp_uri: "https://bpp.example.com",
					version: "2.0.0",
					location: {
						country: {
							code: "IND",
						},
						city: {
							code: "*",
						},
					},
				},
				message: {
					item_id: "i1",
					item_count: 3,
				},
			},
			saved_info: {},
		},
		{
			action_id: "select_1",
			payload: {
				context: {
					domain: "ONDC:TRV14",
					action: "select",
					timestamp: "2025-10-14T09:04:04.826Z",
					transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
					message_id: "f68bf884-39b4-4a00-8919-07d68661290c",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					bpp_id: "sample-bpp-id",
					bpp_uri: "https://bpp.example.com",
					version: "2.0.0",
					location: {
						country: {
							code: "IND",
						},
						city: {
							code: "*",
						},
					},
				},
				message: {},
			},
			saved_info: {},
		},
		{
			action_id: "on_select_1",
			payload: {
				context: {
					domain: "ONDC:TRV14",
					action: "on_select",
					timestamp: "2025-10-14T09:16:39.479Z",
					transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
					message_id: "f68bf884-39b4-4a00-8919-07d68661290c",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					bpp_id: "sample-bpp-id",
					bpp_uri: "https://bpp.example.com",
					version: "2.0.0",
					location: {
						country: {
							code: "IND",
						},
						city: {
							code: "*",
						},
					},
				},
				message: {},
			},
			saved_info: {},
		},
		{
			action_id: "on_status_test",
			payload: {
				context: {
					domain: "ONDC:TRV14",
					action: "on_status",
					timestamp: "2025-10-14T09:16:39.931Z",
					transaction_id: "a1855c22-0489-419d-a85f-5953e009890e",
					message_id: "18634bf4-b6b7-4f94-9f33-ddfe95a65963",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					bpp_id: "sample-bpp-id",
					bpp_uri: "https://bpp.example.com",
					version: "2.0.0",
					location: {
						country: {
							code: "IND",
						},
						city: {
							code: "*",
						},
					},
				},
				message: {},
			},
			saved_info: {},
		},
	],
	validationLib: "",
	helperLib: "",
};

describe("configHelper", () => {
	describe("createInitialMockConfig", () => {
		it("should create a basic mock config with correct structure", () => {
			const domain = "ONDC:RET10";
			const version = "1.2.0";
			const flowId = "retail-flow";

			const result = createInitialMockConfig(domain, version, flowId);

			expect(result).toHaveProperty("meta");
			expect(result).toHaveProperty("transaction_data");
			expect(result).toHaveProperty("steps");
			expect(result).toHaveProperty("transaction_history");
			expect(result).toHaveProperty("validationLib");
			expect(result).toHaveProperty("helperLib");
		});

		it("should set meta fields correctly", () => {
			const domain = "ONDC:TRV14";
			const version = "2.0.0";
			const flowId = "test-flow";

			const result = createInitialMockConfig(domain, version, flowId);

			expect(result.meta).toEqual({
				domain: "ONDC:TRV14",
				version: "2.0.0",
				flowId: "test-flow",
			});
		});

		it("should generate a UUID for transaction_id", () => {
			const result = createInitialMockConfig("ONDC:RET10", "1.0.0", "test");

			expect(result.transaction_data.transaction_id).toBe("test-uuid-1234");
		});

		it("should set transaction_data with default values", () => {
			const result = createInitialMockConfig("ONDC:RET10", "1.0.0", "test");

			expect(result.transaction_data).toEqual({
				transaction_id: "test-uuid-1234",
				latest_timestamp: "1970-01-01T00:00:00.000Z",
				bap_id: "sample-bap-id",
				bap_uri: "https://bap.example.com",
				bpp_id: "sample-bpp-id",
				bpp_uri: "https://bpp.example.com",
			});
		});

		it("should initialize empty arrays and strings", () => {
			const result = createInitialMockConfig("ONDC:RET10", "1.0.0", "test");

			expect(result.steps).toEqual([]);
			expect(result.transaction_history).toEqual([]);
			expect(result.validationLib).toBe("");
		});

		it("should handle different domain formats", () => {
			const result1 = createInitialMockConfig("ONDC:RET10", "1.0.0", "test");
			const result2 = createInitialMockConfig("ONDC:TRV14", "2.0.0", "test");
			const result3 = createInitialMockConfig("ONDC:FIS12", "1.1.0", "test");

			expect(result1.meta.domain).toBe("ONDC:RET10");
			expect(result2.meta.domain).toBe("ONDC:TRV14");
			expect(result3.meta.domain).toBe("ONDC:FIS12");
		});

		it("should handle different version formats", () => {
			const result1 = createInitialMockConfig("ONDC:RET10", "1.0.0", "test");
			const result2 = createInitialMockConfig("ONDC:RET10", "2.1.5", "test");
			const result3 = createInitialMockConfig(
				"ONDC:RET10",
				"0.9.0-beta",
				"test",
			);

			expect(result1.meta.version).toBe("1.0.0");
			expect(result2.meta.version).toBe("2.1.5");
			expect(result3.meta.version).toBe("0.9.0-beta");
		});

		it("should handle special characters in flowId", () => {
			const result = createInitialMockConfig(
				"ONDC:RET10",
				"1.0.0",
				"test-flow_v1.0",
			);

			expect(result.meta.flowId).toBe("test-flow_v1.0");
		});
	});

	describe("convertToFlowConfig", () => {
		it("should convert mock config to flow config with correct structure", () => {
			const result = convertToFlowConfig(testMockConfig);
			expect(result).toHaveProperty("id");
			expect(result).toHaveProperty("description");
			expect(result).toHaveProperty("sequence");
			expect(Array.isArray(result.sequence)).toBe(true);
		});

		it("should set flow id from meta.flowId", () => {
			const result = convertToFlowConfig(testMockConfig);

			expect(result.id).toBe("test");
		});

		it("should initialize description as empty string", () => {
			const result = convertToFlowConfig(testMockConfig);

			expect(result.description).toBe("");
		});

		it("should create sequence array with correct length", () => {
			const result = convertToFlowConfig(testMockConfig);

			expect(result.sequence).toHaveLength(testMockConfig.steps.length);
		});

		it("should map step properties correctly", () => {
			const result = convertToFlowConfig(testMockConfig);
			const firstStep = result.sequence[0];

			expect(firstStep).toEqual({
				key: "test",
				type: "search",
				owner: "BAP",
				description: "please add relevant description",
				expect: true, // First step should have expect: true
				unsolicited: false,
				pair: "on_search_test", // Should find the matching response
				repeat: 1,
			});
		});

		it("should set expect: true only for the first step", () => {
			const result = convertToFlowConfig(testMockConfig);

			expect(result.sequence[0].expect).toBe(true);
			expect(result.sequence[1].expect).toBe(false);
			expect(result.sequence[2].expect).toBe(false);
		});

		it("should find correct response pairs", () => {
			const result = convertToFlowConfig(testMockConfig);

			// "test" step should be paired with "on_search_test"
			const searchStep = result.sequence.find((s: any) => s.key === "test");
			expect(searchStep.pair).toBe("on_search_test");

			// "select_1" step should be paired with "on_select_1"
			const selectStep = result.sequence.find((s: any) => s.key === "select_1");
			expect(selectStep.pair).toBe("on_select_1");
		});

		it("should handle steps without response pairs", () => {
			const result = convertToFlowConfig(testMockConfig);

			// "on_search_test" doesn't have a pair (it IS a response)
			const onSearchStep = result.sequence.find(
				(s: any) => s.key === "on_search_test",
			);
			expect(onSearchStep.pair).toBeNull();

			// "on_status_test" is unsolicited and doesn't have a pair
			const onStatusStep = result.sequence.find(
				(s: any) => s.key === "on_status_test",
			);
			expect(onStatusStep.pair).toBeNull();
		});

		it("should preserve step properties", () => {
			const result = convertToFlowConfig(testMockConfig);

			result.sequence.forEach((flowStep: any, index: number) => {
				const originalStep = testMockConfig.steps[index];
				expect(flowStep.key).toBe(originalStep.action_id);
				expect(flowStep.type).toBe(originalStep.api);
				expect(flowStep.owner).toBe(originalStep.owner);
				expect(flowStep.description).toBe(originalStep.description);
				expect(flowStep.unsolicited).toBe(originalStep.unsolicited);
			});
		});

		it("should handle steps with inputs", () => {
			const result = convertToFlowConfig(testMockConfig);

			// Find the step with inputs (on_search_test)
			const stepWithInputs = result.sequence.find(
				(s: any) => s.key === "on_search_test",
			);

			expect(stepWithInputs.input).toEqual([
				{
					name: "ExampleInputId",
					type: "ExampleInputId",
					schema: {
						$schema: "http://json-schema.org/draft-07/schema#",
						type: "object",
						properties: {
							item_id: {
								type: "string",
								description: "item id",
							},
							item_count: {
								type: "integer",
								minimum: 0,
								maximum: 12,
								description: "item count",
							},
							required: ["item_id", "item_count"],
							additionalProperties: false,
						},
					},
				},
			]);
		});

		it("should handle steps without inputs", () => {
			const result = convertToFlowConfig(testMockConfig);

			// Find steps without inputs
			const stepsWithoutInputs = result.sequence.filter(
				(s: any) => s.key !== "on_search_test",
			);

			stepsWithoutInputs.forEach((step: any) => {
				expect(step.input).toBeUndefined();
			});
		});

		it("should handle empty steps array", () => {
			const emptyConfig: MockPlaygroundConfigType = {
				...testMockConfig,
				steps: [],
			};

			const result = convertToFlowConfig(emptyConfig);

			expect(result.sequence).toEqual([]);
		});

		it("should handle config with single step", () => {
			const singleStepConfig: MockPlaygroundConfigType = {
				...testMockConfig,
				steps: [testMockConfig.steps[0]],
			};

			const result = convertToFlowConfig(singleStepConfig);

			expect(result.sequence).toHaveLength(1);
			expect(result.sequence[0].expect).toBe(true);
			expect(result.sequence[0].pair).toBeNull(); // No pair available
		});

		it("should handle unsolicited steps correctly", () => {
			const result = convertToFlowConfig(testMockConfig);

			const unsolicitedStep = result.sequence.find(
				(s: any) => s.key === "on_status_test",
			);
			expect(unsolicitedStep.unsolicited).toBe(true);
			expect(unsolicitedStep.pair).toBeNull();
		});

		it("should maintain correct order of steps", () => {
			const result = convertToFlowConfig(testMockConfig);

			const expectedOrder = [
				"test",
				"on_search_test",
				"select_1",
				"on_select_1",
				"on_status_test",
			];

			result.sequence.forEach((step: any, index: number) => {
				expect(step.key).toBe(expectedOrder[index]);
			});
		});
	});

	describe("generatePlaygroundConfigFromFlowConfig", () => {
		// Minimal payload type compatible with the helper
		type TestPayload = {
			context: {
				action: string;
				timestamp: string;
				domain: string;
				version?: string;
				core_version?: string;
			};
		};

		it("should generate config with meta derived from earliest payload and map steps", async () => {
			const searchPayload: TestPayload = {
				context: {
					action: "search",
					timestamp: "2025-01-01T09:00:00.000Z",
					domain: "ONDC:TRV14",
					version: "1.5.0",
				},
			};
			const onSearchPayload: TestPayload = {
				context: {
					action: "on_search",
					timestamp: "2025-01-02T10:00:00.000Z",
					domain: "ONDC:TRV14",
					version: "1.5.0",
				},
			};

			// Intentionally unsorted by timestamp to verify internal sorting
			const payloads: TestPayload[] = [onSearchPayload, searchPayload];

			const flowConfig: Flow = {
				id: "sample_flow",
				title: "Sample Flow",
				description: "Test flow for playground config generation",
				sequence: [
					{
						key: "search_step",
						type: "search",
						unsolicited: false,
						description: "Search step",
						pair: null,
						owner: "BAP",
					},
					{
						key: "on_search_step",
						type: "on_search",
						unsolicited: false,
						description: "On search step",
						pair: "search_step",
						owner: "BPP",
					},
				],
			};

			const config = await generatePlaygroundConfigFromFlowConfig(
				payloads,
				flowConfig,
			);

			expect(config.meta.domain).toBe("ONDC:TRV14");
			expect(config.meta.version).toBe("1.5.0");
			expect(config.meta.flowId).toBe(
				"sample_flow_logs_flow_ONDC:TRV14_v1.5.0",
			);

			expect(config.steps).toHaveLength(2);
			const [searchStepConfig, onSearchStepConfig] = config.steps;

			expect(searchStepConfig.api).toBe("search");
			expect(searchStepConfig.action_id).toBe("search_step");
			expect(searchStepConfig.responseFor).toBe("on_search_step");
			expect(searchStepConfig.unsolicited).toBe(false);
			expect(searchStepConfig.mock.inputs).toEqual({});
			expect(searchStepConfig.mock.defaultPayload).toBe(searchPayload);

			expect(onSearchStepConfig.api).toBe("on_search");
			expect(onSearchStepConfig.action_id).toBe("on_search_step");
			expect(onSearchStepConfig.responseFor).toBeNull();
			expect(onSearchStepConfig.unsolicited).toBe(false);
			expect(onSearchStepConfig.mock.inputs).toEqual({});
			expect(onSearchStepConfig.mock.defaultPayload).toBe(onSearchPayload);
		});

		it("should ignore HTML_FORM and DYNAMIC_FORM steps and preserve unsolicited flag", async () => {
			const payloads: TestPayload[] = [
				{
					context: {
						action: "search",
						timestamp: "2025-01-01T09:00:00.000Z",
						domain: "ONDC:RET10",
						version: "2.0.0",
					},
				},
				{
					context: {
						action: "on_status",
						timestamp: "2025-01-01T10:00:00.000Z",
						domain: "ONDC:RET10",
						version: "2.0.0",
					},
				},
			];

			const flowConfig: Flow = {
				id: "flow_with_forms",
				sequence: [
					{
						key: "search_step",
						type: "search",
						unsolicited: false,
						description: "Search step",
						pair: null,
						owner: "BAP",
					},
					{
						key: "html_form_step",
						type: "HTML_FORM",
						unsolicited: false,
						description: "HTML form step",
						pair: null,
						owner: "BAP",
					},
					{
						key: "dynamic_form_step",
						type: "DYNAMIC_FORM",
						unsolicited: false,
						description: "Dynamic form step",
						pair: null,
						owner: "BAP",
					},
					{
						key: "on_status_step",
						type: "on_status",
						unsolicited: true,
						description: "Unsolicited status",
						pair: null,
						owner: "BPP",
					},
				],
			};

			const config = await generatePlaygroundConfigFromFlowConfig(
				payloads,
				flowConfig,
			);

			// Only non-form steps should be present
			expect(config.steps.map((s) => s.action_id)).toEqual([
				"search_step",
				"on_status_step",
			]);

			const onStatusStep = config.steps.find(
				(s) => s.action_id === "on_status_step",
			);
			expect(onStatusStep?.unsolicited).toBe(true);
		});

		it("should derive version from core_version when version is missing", async () => {
			const payloads: TestPayload[] = [
				{
					context: {
						action: "search",
						timestamp: "2025-01-01T09:00:00.000Z",
						domain: "ONDC:FIS12",
						core_version: "1.0.0",
					},
				},
			];

			const flowConfig: Flow = {
				id: "core_version_flow",
				sequence: [
					{
						key: "search_step",
						type: "search",
						unsolicited: false,
						description: "Search step",
						pair: null,
						owner: "BAP",
					},
				],
			};

			const config = await generatePlaygroundConfigFromFlowConfig(
				payloads,
				flowConfig,
			);

			expect(config.meta.domain).toBe("ONDC:FIS12");
			expect(config.meta.version).toBe("1.0.0");
			expect(config.meta.flowId).toBe(
				"core_version_flow_logs_flow_ONDC:FIS12_v1.0.0",
			);
		});
	});

	describe("Edge Cases", () => {
		it("should handle config with missing description", () => {
			const configWithoutDesc = {
				...testMockConfig,
				steps: [
					{
						...testMockConfig.steps[0],
						description: undefined,
					},
				],
			};

			const result = convertToFlowConfig(configWithoutDesc as any);
			expect(result.sequence[0].description).toBe("");
		});

		it("should handle config with null responseFor", () => {
			const configWithNull = {
				...testMockConfig,
				steps: [
					{
						...testMockConfig.steps[0],
						responseFor: null,
					},
				],
			};

			const result = convertToFlowConfig(configWithNull);
			expect(result.sequence[0].pair).toBeNull();
		});

		it("should handle config with complex input schemas", () => {
			const configWithComplexInputs = {
				...testMockConfig,
				steps: [
					{
						...testMockConfig.steps[1], // Use the step with inputs
						mock: {
							...testMockConfig.steps[1].mock,
							inputs: {
								id: "ComplexInputId",
								jsonSchema: {
									$schema: "http://json-schema.org/draft-07/schema#",
									type: "object",
									properties: {
										nested: {
											type: "object",
											properties: {
												value: { type: "string" },
											},
										},
									},
									required: ["nested"],
								},
							},
						},
					},
				],
			};

			const result = convertToFlowConfig(configWithComplexInputs);
			expect(result.sequence[0].input[0].name).toBe("ComplexInputId");
			expect(
				result.sequence[0].input[0].schema.properties.nested,
			).toBeDefined();
		});
	});
});
