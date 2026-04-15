import { writeFileSync } from "fs";
import { convertToFlowConfig } from "../lib/configHelper";

const data = {
	meta: {
		domain: "ONDC:FIS12",
		version: "2.2.0",
		flowId: "Purchase_Finance_With_AA",
		config_version: "0.0.0001",
		description: "Metro - Cancel Flow",
		use_case_id: "PURCHASE FINANCE",
		flowName: "Purchase Finance With AA",
	},
	transaction_data: {
		transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
		latest_timestamp: "1970-01-01T00:00:00.000Z",
		bap_id: "bap.example.com",
		bap_uri: "https://bap.example.com",
		bpp_id: "bpp.example.com",
		bpp_uri: "https://bpp.example.com",
	},
	steps: [
		{
			api: "search",
			action_id: "search1_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "825ea3d2-4ef9-43bf-a651-fa8d36cfa142",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_search",
			action_id: "on_search1_purchase_finance",
			owner: "BPP",
			responseFor: "search1_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "daae8ec6-7f74-4e1e-831e-f6fae4771dff",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "HTML_FORM",
			action_id: "product_details_form",
			owner: "BPP",
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
				defaultPayload: {},
				saveData: {},
				inputs: {
					oldInputs: [
						{
							name: "form_submission_id",
							label: "Enter Form Submission id",
							type: "HTML_FORM",
							reference: "$.reference_data.product_details_form",
						},
					],
				},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJhZGRpdGlvbmFsRGV0YWlsc0Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
			examples: [],
		},
		{
			api: "search",
			action_id: "search2_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "24f2e86d-d32c-44e8-a369-a9c10ae5605d",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {
					oldInputs: [
						{
							name: "search_input",
							label: "Enter Search Input",
							type: "fis12_search_pl",
						},
					],
					id: "old_inputs",
				},
			},
			examples: [],
		},
		{
			api: "on_search",
			action_id: "on_search2_purchase_finance",
			owner: "BPP",
			responseFor: "search2_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "225e315f-04c9-441c-b6d8-a409041afb02",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "HTML_FORM",
			action_id: "personal_details_information_form",
			owner: "BPP",
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
				defaultPayload: {},
				saveData: {},
				inputs: {
					oldInputs: [
						{
							name: "form_submission_id",
							label: "Enter Form Submission id",
							type: "HTML_FORM",
							reference: "$.reference_data.personal_details_information_form",
						},
					],
				},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJhZGRpdGlvbmFsRGV0YWlsc0Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
			examples: [],
		},
		{
			api: "search",
			action_id: "search3_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "a53d2efc-ecc5-44ac-a969-07d73ae6e842",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_search",
			action_id: "on_search5_purchase_finance",
			owner: "BPP",
			responseFor: "search3_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "84feb1fa-18ed-444e-9428-60db9b4f037e",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "search",
			action_id: "search4_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "3bc4d090-fccc-41d9-8c7d-1ccf90e2ab16",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {
					oldInputs: [
						{
							name: "finvu_verification",
							label: "Complete Account Aggregator Verification",
							type: "FINVU_REDIRECT",
							payloadField: "$.context.aa_consent_verified",
						},
					],
					id: "old_inputs",
				},
			},
			examples: [],
		},
		{
			api: "on_search",
			action_id: "on_search6_purchase_finance",
			owner: "BPP",
			responseFor: "search4_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_search",
						timestamp: "2026-04-10T07:44:23.251Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "e7f3f3f9-008f-4f17-893f-9de5f0ee96ae",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "select",
			action_id: "select_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "select",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "9da81c13-7dd6-4ddf-9cae-6d0feb4286ac",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {
					oldInputs: [
						{
							name: "select_input",
							label: "Enter",
							type: "fis12_select_pl",
						},
					],
					id: "old_inputs",
				},
			},
			examples: [],
		},
		{
			api: "on_select",
			action_id: "on_select_purchase_finance",
			owner: "BPP",
			responseFor: "select_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_select",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "4e4f7a7b-d5ae-41dc-9c08-44d6ee334beb",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "HTML_FORM",
			action_id: "down_payment_form",
			owner: "BPP",
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
				defaultPayload: {},
				saveData: {},
				inputs: {
					oldInputs: [
						{
							name: "form_submission_id",
							label: "Enter Form Submission id",
							type: "HTML_FORM",
							reference: "$.reference_data.down_payment_form",
						},
					],
				},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJhZGRpdGlvbmFsRGV0YWlsc0Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
			examples: [],
		},
		{
			api: "select",
			action_id: "select1_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "select",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "6fb2d819-db09-4dc3-a5cd-ff95c880af60",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_select",
			action_id: "on_select1_purchase_finance",
			owner: "BPP",
			responseFor: "select1_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_select",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "99c6fd21-030d-4642-8d58-33f7f668e45d",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "DYNAMIC_FORM",
			action_id: "Ekyc_details_verification_status",
			owner: "BPP",
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
				defaultPayload: {},
				saveData: {},
				inputs: {
					oldInputs: [
						{
							name: "form_submission_id",
							label: "Enter Form Submission id",
							type: "DYNAMIC_FORM",
							payloadField: "form_submission_id",
							reference: "$.reference_data.Ekyc_details_verification_status",
						},
					],
				},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJhZGRpdGlvbmFsRGV0YWlsc0Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
			examples: [],
		},
		{
			api: "on_status",
			action_id: "on_status_unsolicited",
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
						domain: "ONDC:FIS12",
						action: "on_status",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "cd84e20a-7f07-4507-b318-90619f45c6e6",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "select",
			action_id: "select2_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "select",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "78381161-ad4f-46ce-af1b-3e721430c980",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_select",
			action_id: "on_select2_purchase_finance",
			owner: "BPP",
			responseFor: "select2_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_select",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "93af536b-4da5-4f65-b022-58345ac278d3",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "init",
			action_id: "init1_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "init",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "23c315f4-8edf-40eb-8daa-fd2d15637164",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_init",
			action_id: "on_init1_purchase_finance",
			owner: "BPP",
			responseFor: "init1_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_init",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "3236e860-9df8-441a-a824-5a7fcc10c221",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "DYNAMIC_FORM",
			action_id: "Emanadate_verification_status",
			owner: "BPP",
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
				defaultPayload: {},
				saveData: {},
				inputs: {
					oldInputs: [
						{
							name: "form_submission_id",
							label: "Enter Form Submission id",
							type: "DYNAMIC_FORM",
							reference: "$.reference_data.Emanadate_verification_status",
						},
					],
				},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJhZGRpdGlvbmFsRGV0YWlsc0Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
			examples: [],
		},
		{
			api: "on_status",
			action_id: "on_status_unsolicited",
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
						domain: "ONDC:FIS12",
						action: "on_status",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "1b98a896-72f1-454d-bbac-935a7b2f8888",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "init",
			action_id: "init2_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "init",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "97540236-1b3a-4a9e-8c45-83a0affdce4b",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_init",
			action_id: "on_init2_purchase_finance",
			owner: "BPP",
			responseFor: "init2_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_init",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "3df24c53-e79b-47ae-bcce-d085d56c4591",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "DYNAMIC_FORM",
			action_id: "E_sign_verification_status",
			owner: "BPP",
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
				defaultPayload: {},
				saveData: {},
				inputs: {
					oldInputs: [
						{
							name: "form_submission_id",
							label: "Enter Form Submission id",
							type: "DYNAMIC_FORM",
							reference: "$.reference_data.E_sign_verification_status",
						},
					],
				},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJhZGRpdGlvbmFsRGV0YWlsc0Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
			examples: [],
		},
		{
			api: "on_status",
			action_id: "on_status_unsolicited",
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
						domain: "ONDC:FIS12",
						action: "on_status",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "b9d768d4-6782-4513-84dc-d06768e0d7cf",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "init",
			action_id: "init3_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "init",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "7efe3d44-3011-4eed-bdd2-cc8101f849fe",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_init",
			action_id: "on_init3_purchase_finance",
			owner: "BPP",
			responseFor: "init3_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_init",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "add33b98-3f9d-48cd-9bf2-03377ae99814",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "confirm",
			action_id: "confirm_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "confirm",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "66327540-b98a-48e9-870e-0a472a551715",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_confirm",
			action_id: "on_confirm_purchase_finance",
			owner: "BPP",
			responseFor: "confirm_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_confirm",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "092fd671-2be7-45cf-bd7e-218f3223a741",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "update",
			action_id: "update_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "update",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "0f9b6fcf-9ebb-470a-abf7-5dfcd535e0c7",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_update",
			action_id: "on_update_purchase_finance",
			owner: "BPP",
			responseFor: "update_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_update",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "fac04ea0-e802-4c18-bcf9-62ec85f2cb88",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
		{
			api: "on_update",
			action_id: "on_update1_unsolicited_purchase_finance",
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
						domain: "ONDC:FIS12",
						action: "on_update",
						timestamp: "2026-04-10T07:44:23.252Z",
						transaction_id: "1dcc97e3-e6fc-414e-946c-9abc40c496a7",
						message_id: "aef7d6ab-f3da-4c3d-b9ff-316dc90b472c",
						bap_id: "bap.example.com",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "bpp.example.com",
						bpp_uri: "https://bpp.example.com",
						version: "2.2.0",
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
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					city_code: "$.context.location.city.code",
				},
				inputs: {},
			},
			examples: [],
		},
	],
	transaction_history: [],
	validationLib: "",
	helperLib:
		"LyoKCUN1c3RvbSBoZWxwZXIgZnVuY3Rpb25zIGF2YWlsYWJsZSBpbiBhbGwgbW9jayBnZW5lcmF0aW9uIGZ1bmN0aW9ucy4KCXRoZXNlIGFyZSBhcHBlbmRlZCBiZWxvdyB0aGUgZ2VuZXJhdGUgZnVuY3Rpb24gZm9yIGVhY2ggc3RlcC4KKi8KCmNvbnN0IGNyZWF0ZUZvcm1VUkwgPSAoZG9tYWluLGZvcm1JZCwgc2Vzc2lvbkRhdGEpID0+IHsKCWNvbnN0IGJhc2VVUkwgPSBzZXNzaW9uRGF0YS5tb2NrQmFzZVVybDsKCWNvbnN0IHRyYW5zYWN0aW9uSWQgPSBzZXNzaW9uRGF0YS50cmFuc2FjdGlvbklkWzBdOwoJY29uc3Qgc2Vzc2lvbklkID0gc2Vzc2lvbkRhdGEuc2Vzc2lvbklkOwoJcmV0dXJuIGAke2Jhc2VVUkx9L2Zvcm1zLyR7ZG9tYWlufS8ke2Zvcm1JZH0vP3RyYW5zYWN0aW9uX2lkPSR7dHJhbnNhY3Rpb25JZH0mc2Vzc2lvbl9pZD0ke3Nlc3Npb25JZH1gOwp9CgovLyBHZW5lcmF0ZXMgYSBVVUlEIHY0CmZ1bmN0aW9uIHV1aWR2NCgpIHsKCXJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uIChjKSB7CgkgIGNvbnN0IHIgPSBNYXRoLnJhbmRvbSgpICogMTYgfCAwOwoJICBjb25zdCB2ID0gYyA9PT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KTsKCSAgcmV0dXJuIHYudG9TdHJpbmcoMTYpOwoJfSk7Cn0KCi8vIEdlbmVyYXRlIGEgNiBkaWdpdCBzdHJpbmcgSUQKZnVuY3Rpb24gZ2VuZXJhdGU2RGlnaXRJZCgpIHsKCXJldHVybiBNYXRoLmZsb29yKDEwMDAwMCArIE1hdGgucmFuZG9tKCkgKiA5MDAwMDApLnRvU3RyaW5nKCk7Cn0KCi8vIFJldHVybnMgdGhlIGN1cnJlbnQgSVNPIHRpbWVzdGFtcApmdW5jdGlvbiBjdXJyZW50VGltZXN0YW1wKCkgewoJcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsKfQoKLy8gQ29udmVydHMgSVNPIDg2MDEgZHVyYXRpb24gc3RyaW5nIHRvIHRvdGFsIHNlY29uZHMKY29uc3QgaXNvRHVyVG9TZWMgPSAoZHVyYXRpb24pID0+IHsKICBjb25zdCBkdXJSRSA9IC9QKChkKylZKT8oKGQrKU0pPygoZCspVyk/KChkKylEKT9UPygoZCspSCk/KChkKylNKT8oKGQrKVMpPy87CiAgY29uc3QgcyA9IGR1clJFLmV4ZWMoZHVyYXRpb24pOwogIGlmICghcykgcmV0dXJuIDA7CiAgCiAgcmV0dXJuIChOdW1iZXIocz8uWzJdKSB8fCAwKSAqIDMxNTM2MDAwICsKCShOdW1iZXIocz8uWzRdKSB8fCAwKSAqIDI2MjgyODggKwoJKE51bWJlcihzPy5bNl0pIHx8IDApICogNjA0ODAwICsKCShOdW1iZXIocz8uWzhdKSB8fCAwKSAqIDg2NDAwICsKCShOdW1iZXIocz8uWzEwXSkgfHwgMCkgKiAzNjAwICsKCShOdW1iZXIocz8uWzEyXSkgfHwgMCkgKiA2MCArCgkoTnVtYmVyKHM/LlsxNF0pIHx8IDApOwp9OwoKY29uc3Qgc2V0Q2l0eUZyb21JbnB1dHMgPSAocGF5bG9hZCwgaW5wdXRzKSA9PiB7CglpZiAoIWlucHV0cykgcmV0dXJuICIqIjsKCWxldCB2ZXJzaW9uID0gcGF5bG9hZC5jb250ZXh0LnZlcnNpb24gfHwgcGF5bG9hZC5jb250ZXh0LmNvcmVfdmVyc2lvbiB8fCAiMi4wLjAiOwoJaWYgKHZlcnNpb24uc3RhcnRzV2l0aCgiMSIpKSB7CgkJcGF5bG9hZC5jb250ZXh0LmNpdHkgPSBpbnB1dHMuY2l0eV9jb2RlID8/ICIqIjsKCX0gZWxzZSB7CgkJcGF5bG9hZC5jb250ZXh0LmxvY2F0aW9uLmNpdHkuY29kZSA9IGlucHV0cy5jaXR5X2NvZGUgPz8gIioiOwoJfQp9Cg==",
};

const converted = convertToFlowConfig(data as any);

writeFileSync("./test.json", JSON.stringify(converted, null, 2), "utf-8");
