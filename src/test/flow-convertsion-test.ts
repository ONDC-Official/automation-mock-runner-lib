import { writeFileSync } from "fs";
import { convertToFlowConfig } from "../lib/configHelper";

const data = {
	meta: {
		domain: "ONDC:FIS12",
		version: "2.0.2",
		flowId: "form_test",
	},
	transaction_data: {
		transaction_id: "937e0b33-3466-4c69-bf4d-e88cc242b68a",
		latest_timestamp: "1970-01-01T00:00:00.000Z",
		bap_id: "sample-bap-id",
		bap_uri: "https://bap.example.com",
		bpp_id: "sample-bpp-id",
		bpp_uri: "https://bpp.example.com",
	},
	steps: [
		{
			api: "search",
			action_id: "search",
			owner: "BAP",
			responseFor: null,
			unsolicited: false,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICAvLyBkZWZhdWx0UGF5bG9hZC5jb250ZXh0Lm1lc3NhZ2VfaWQgPSAiOTM3ZTBiMzMtMzQ2Ni00YzY5LWJmNGQtZTg4Y2MyNDJiNjhhIjsKICByZXR1cm4gZGVmYXVsdFBheWxvYWQ7Cn0=",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiVmFsaWQgcmVxdWVzdCIgfTsKfQ==",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						domain: "ONDC:FIS12",
						action: "search",
						timestamp: "2026-02-10T10:50:14.707Z",
						transaction_id: "937e0b33-3466-4c69-bf4d-e88cc242b68a",
						message_id: "acbc6909-4474-49fd-ab1f-6a992adbb8a3",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						version: "2.0.2",
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
				},
				inputs: {},
			},
		},
		{
			api: "on_search",
			action_id: "on_search",
			owner: "BPP",
			responseFor: "search",
			unsolicited: true,
			description: "please add relevant description",
			mock: {
				generate:
					"LyoqCiAqIEdlbmVyYXRlcyB0aGUgbW9jayBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogVGhpcyBmdW5jdGlvbiBhbGxvd3MgY3VzdG9taXphdGlvbiBvZiB0aGUgZGVmYXVsdCBwYXlsb2FkIHVzaW5nIHNlc3Npb24gZGF0YQogKiBmcm9tIHByZXZpb3VzIHN0ZXBzIGFuZCB1c2VyIGlucHV0cy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0UGF5bG9hZCAtIFRoZSBiYXNlIHBheWxvYWQgb2JqZWN0IHdpdGggY29udGV4dCBhbHJlYWR5IHBvcHVsYXRlZC4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhLnVzZXJfaW5wdXRzIC0gVXNlci1wcm92aWRlZCBpbnB1dCB2YWx1ZXMgZm9yIHRoaXMgc3RlcC4KICogQHBhcmFtIHsqfSBzZXNzaW9uRGF0YS5ba2V5XSAtIEFueSBzYXZlZCBkYXRhIGZyb20gcHJldmlvdXMgc3RlcHMgKGRlZmluZWQgaW4gc2F2ZURhdGEgY29uZmlnKS4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBnZW5lcmF0ZWQgcGF5bG9hZCBvYmplY3QgdG8gYmUgc2VudCBpbiB0aGUgQVBJIHJlcXVlc3QuCiAqLwphc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShkZWZhdWx0UGF5bG9hZCwgc2Vzc2lvbkRhdGEpIHsKICAvLyBkZWZhdWx0UGF5bG9hZC5jb250ZXh0Lm1lc3NhZ2VfaWQgPSBzZXNzaW9uRGF0YS5sYXRlc3RNZXNzYWdlX2lkWzBdOwogIC8vJC5tZXNzYWdlLm9yZGVyLml0ZW1zWypdLnhpbnB1dC5mb3JtLnVybAogIC8vIGRlZmF1bHRQYXlsb2FkLmNvbnRleHQubWVzc2FnZV9pZCA9ICI5MzdlMGIzMy0zNDY2LTRjNjktYmY0ZC1lODhjYzI0MmI2OGEiOwoKICBkZWZhdWx0UGF5bG9hZC5tZXNzYWdlLmNhdGFsb2cuZGVzY3JpcHRvci5uYW1lID0gY3JlYXRlRm9ybVVSTCgiT05EQzpGSVMxMiIsICJ0ZXN0X2Zvcm0iLCBzZXNzaW9uRGF0YSk7CiAgLy8gZGVmYXVsdFBheWxvYWQudXJsID0gY3JlYXRlRm9ybVVSTCgiT05EQzpGSVMxMiIsInRlc3RfZm9ybSIsIHNlc3Npb25EYXRhKTsgIAogIHJldHVybiBkZWZhdWx0UGF5bG9hZDsKfQ==",
				validate:
					"LyoqCiAqIFZhbGlkYXRlcyB0aGUgaW5jb21pbmcgcmVxdWVzdCBwYXlsb2FkIGZvciBhbiBBUEkgY2FsbCBpbiB0aGUgdHJhbnNhY3Rpb24gZmxvdy4KICogCiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRQYXlsb2FkIC0gVGhlIGluY29taW5nIHJlcXVlc3QgcGF5bG9hZCB0byB2YWxpZGF0ZS4KICogQHBhcmFtIHtPYmplY3R9IHNlc3Npb25EYXRhIC0gRGF0YSBjb2xsZWN0ZWQgZnJvbSBwcmV2aW91cyB0cmFuc2FjdGlvbiBzdGVwcy4KICogCiAqIEByZXR1cm5zIHtPYmplY3R9IHsgdmFsaWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlciwgZGVzY3JpcHRpb246IHN0cmluZyB9CiAqLwpmdW5jdGlvbiB2YWxpZGF0ZSh0YXJnZXRQYXlsb2FkLCBzZXNzaW9uRGF0YSkgewogIHJldHVybiB7IHZhbGlkOiB0cnVlLCBjb2RlOiAyMDAsIGRlc2NyaXB0aW9uOiAiVmFsaWQgcmVxdWVzdCIgfTsKfQ==",
				requirements:
					"LyoqCiAqIENoZWNrcyBpZiB0aGUgcmVxdWlyZW1lbnRzIGZvciBwcm9jZWVkaW5nIHdpdGggdGhlIEFQSSBjYWxsIGFyZSBtZXQuCiAqIAogKiBAcGFyYW0ge09iamVjdH0gc2Vzc2lvbkRhdGEgLSBEYXRhIGNvbGxlY3RlZCBmcm9tIHByZXZpb3VzIHRyYW5zYWN0aW9uIHN0ZXBzLgogKiAKICogQHJldHVybnMge09iamVjdH0geyB2YWxpZDogYm9vbGVhbiwgY29kZTogbnVtYmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nIH0KICovCmZ1bmN0aW9uIG1lZXRzUmVxdWlyZW1lbnRzKHNlc3Npb25EYXRhKSB7CiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGNvZGU6IDIwMCwgZGVzY3JpcHRpb246ICJSZXF1aXJlbWVudHMgbWV0IiB9Owp9",
				defaultPayload: {
					context: {
						action: "on_search",
						bap_id: "dev-automation.ondc.org",
						bap_uri: "http://localhost:6959/api-service/ONDC:FIS12/2.0.2/buyer",
						domain: "ONDC:FIS12",
						location: {
							city: {
								code: "*",
							},
							country: {
								code: "IND",
							},
						},
						message_id: "c90965f2-19c8-408d-b188-b1254d55033c",
						timestamp: "2025-12-16T10:03:22.325Z",
						transaction_id: "f7d2d945-aba7-4315-823d-64019b29a57e",
						ttl: "PT30S",
						version: "2.0.2",
						bpp_id: "dev-automation.ondc.org",
						bpp_uri:
							"http://localhost:6959/api-service/ONDC:FIS12/2.0.2/seller",
					},
					message: {
						catalog: {
							descriptor: {
								name: "ICICI Bank",
							},
							providers: [
								{
									id: "gold_loan_335887d1-6673-4763-a6f2-bd78e19a5d5f",
									descriptor: {
										images: [
											{
												url: "https://www.icicibank.com/content/dam/icicibank/india/assets/images/header/logo.png",
												size_type: "sm",
											},
										],
										name: "ICICI Bank",
										short_desc: "ICICI Bank Ltd",
										long_desc: "ICICI Bank Ltd, India.",
									},
									categories: [
										{
											id: "100001",
											descriptor: {
												code: "GOLD_LOAN",
												name: "Gold Loan",
											},
										},
										{
											id: "101124",
											parent_category_id: "101123",
											descriptor: {
												code: "BUREAU_LOAN",
												name: "Bureau Loan",
											},
										},
										{
											id: "101125",
											parent_category_id: "101123",
											descriptor: {
												code: "AA_LOAN",
												name: "Account Aggregator Loan",
											},
										},
									],
									items: [
										{
											id: "gold_loan_1fca8dc5-7c63-43c9-ad65-3161348cbdd9",
											descriptor: {
												code: "LOAN",
												name: "Gold Loan without AA",
											},
											category_ids: ["101123", "101124"],
											tags: [
												{
													descriptor: {
														code: "GENERAL_INFO",
														name: "General Information",
													},
													list: [
														{
															descriptor: {
																code: "MIN_INTEREST_RATE",
																name: "Minimum Interest Rate",
																short_desc: "Loans starting from 9% (p.a)",
															},
															value: "9%",
														},
														{
															descriptor: {
																code: "MAX_INTEREST_RATE",
																name: "Maximum Interest Rate",
																short_desc: "Loan Rate below from 15% (p.a)",
															},
															value: "15%",
														},
														{
															descriptor: {
																code: "MIN_TENURE",
																name: "Minimum Tenure",
																short_desc:
																	"Loan Tenure starting form 5 months",
															},
															value: "5 months",
														},
														{
															descriptor: {
																code: "MAX_TENURE",
																name: "Maximum Tenure",
																short_desc: "Loan Tenure upto form 5 years",
															},
															value: "5 years",
														},
														{
															descriptor: {
																code: "MIN_LOAN_AMOUNT",
																name: "Minimum Loan Amount",
																short_desc: "Loan Amount starting from 50,000",
															},
															value: "50000",
														},
														{
															descriptor: {
																code: "MAX_LOAN_AMOUNT",
																name: "Minimum Loan Amount",
																short_desc: "Loan Amount upto form 50,00,000",
															},
															value: "5000000",
														},
													],
													display: true,
												},
											],
											matched: true,
											recommended: true,
											xinput: {
												head: {
													descriptor: {
														name: "Customer Information",
													},
													index: {
														min: 0,
														cur: 0,
														max: 0,
													},
													headings: ["PERSONAL_INFORMATION"],
												},
												form: {
													id: "F01",
													mime_type: "text/html",
													url: "http://localhost:3300/forms/FIS12/consumer_information_form?session_id=9xr8WlnL34FutCjOQFCjEyHu1i6pqST8&flow_id=Gold_Loan_Pre_Part_Payment_With_Account_Aggregator&transaction_id=f7d2d945-aba7-4315-823d-64019b29a57e",
													resubmit: false,
													multiple_sumbissions: false,
												},
												required: true,
											},
										},
										{
											id: "gold_loan_728a41ed-2fa2-4ea7-890d-0060845c5ae7",
											descriptor: {
												code: "LOAN",
												name: "Gold Loan with AA",
											},
											category_ids: ["101123", "101125"],
											tags: [
												{
													descriptor: {
														code: "GENERAL_INFO",
														name: "General Information",
													},
													list: [
														{
															descriptor: {
																code: "MIN_INTEREST_RATE",
																name: "Minimum Interest Rate",
																short_desc: "Loans starting from 9% (p.a)",
															},
															value: "9%",
														},
														{
															descriptor: {
																code: "MAX_INTEREST_RATE",
																name: "Maximum Interest Rate",
																short_desc: "Loan Rate below from 15% (p.a)",
															},
															value: "15%",
														},
														{
															descriptor: {
																code: "MIN_TENURE",
																name: "Minimum Tenure",
																short_desc:
																	"Loan Tenure starting form 5 months",
															},
															value: "5 months",
														},
														{
															descriptor: {
																code: "MAX_TENURE",
																name: "Maximum Tenure",
																short_desc: "Loan Tenure upto form 5 years",
															},
															value: "5 years",
														},
														{
															descriptor: {
																code: "MIN_LOAN_AMOUNT",
																name: "Minimum Loan Amount",
																short_desc: "Loan Amount starting from 50,000",
															},
															value: "50000",
														},
														{
															descriptor: {
																code: "MAX_LOAN_AMOUNT",
																name: "Minimum Loan Amount",
																short_desc: "Loan Amount upto form 50,00,000",
															},
															value: "5000000",
														},
													],
													display: true,
												},
											],
											matched: true,
											recommended: true,
											xinput: {
												head: {
													descriptor: {
														name: "Customer Information",
													},
													index: {
														min: 0,
														cur: 0,
														max: 0,
													},
													headings: ["PERSONAL_INFORMATION"],
												},
												form: {
													id: "F01",
													mime_type: "text/html",
													url: "http://localhost:3300/forms/FIS12/consumer_information_form?session_id=9xr8WlnL34FutCjOQFCjEyHu1i6pqST8&flow_id=Gold_Loan_Pre_Part_Payment_With_Account_Aggregator&transaction_id=f7d2d945-aba7-4315-823d-64019b29a57e",
													resubmit: false,
													multiple_sumbissions: false,
												},
												required: true,
											},
										},
									],
									payments: [
										{
											collected_by: "BPP",
											tags: [
												{
													descriptor: {
														code: "BUYER_FINDER_FEES",
													},
													display: false,
													list: [
														{
															descriptor: {
																code: "BUYER_FINDER_FEES_TYPE",
															},
															value: "PERCENT_ANNUALIZED",
														},
														{
															descriptor: {
																code: "BUYER_FINDER_FEES_PERCENTAGE",
															},
															value: "1",
														},
													],
												},
												{
													descriptor: {
														code: "SETTLEMENT_TERMS",
													},
													display: false,
													list: [
														{
															descriptor: {
																code: "SETTLEMENT_WINDOW",
															},
															value: "PT30D",
														},
														{
															descriptor: {
																code: "SETTLEMENT_BASIS",
															},
															value: "INVOICE_RECEIPT",
														},
														{
															descriptor: {
																code: "MANDATORY_ARBITRATION",
															},
															value: "TRUE",
														},
														{
															descriptor: {
																code: "COURT_JURISDICTION",
															},
															value: "New Delhi",
														},
														{
															descriptor: {
																code: "STATIC_TERMS",
															},
															value:
																"https://bpp.credit.becknprotocol.org/personal-banking/loans/gold-loan",
														},
														{
															descriptor: {
																code: "OFFLINE_CONTRACT",
															},
															value: "true",
														},
													],
												},
											],
										},
									],
									tags: [
										{
											descriptor: {
												code: "CONTACT_INFO",
												name: "Contact Info",
											},
											list: [
												{
													descriptor: {
														code: "GRO_NAME",
														name: "Gro name",
													},
													value: "ICICI",
												},
												{
													descriptor: {
														code: "GRO_EMAIL",
														name: "Gro email",
													},
													value: "lifeline@iciciprulife.com",
												},
												{
													descriptor: {
														code: "GRO_CONTACT_NUMBER",
														name: "Gro contact number",
													},
													value: "1860 266 7766",
												},
												{
													descriptor: {
														code: "CUSTOMER_SUPPORT_LINK",
														name: "Customer support link",
													},
													value:
														"https://buy.iciciprulife.com/buy/GrievanceRedStep.htm?execution=e1s1",
												},
												{
													descriptor: {
														code: "CUSTOMER_SUPPORT_CONTACT_NUMBER",
														name: "Customer support contact number",
													},
													value: "1800 1080",
												},
												{
													descriptor: {
														code: "CUSTOMER_SUPPORT_EMAIL",
														name: "Customer support email",
													},
													value: "customer.care@icicibank.com",
												},
											],
										},
										{
											descriptor: {
												code: "LSP_INFO",
												name: "Lsp Info",
											},
											list: [
												{
													descriptor: {
														code: "LSP_NAME",
														name: "Lsp name",
													},
													value: "ICICI_LSP",
												},
												{
													descriptor: {
														code: "LSP_EMAIL",
														name: "Lsp email",
													},
													value: "lsp@iciciprulife.com",
												},
												{
													descriptor: {
														code: "LSP_CONTACT_NUMBER",
														name: "Lsp contact number",
													},
													value: "1860 266 7766",
												},
												{
													descriptor: {
														code: "LSP_ADDRESS",
														name: "Lsp Address",
													},
													value:
														"One Indiabulls centre, Tower 1, 18th Floor Jupiter mill compound 841, Senapati Bapat Marg, Elphinstone Road, Mumbai 400013",
												},
											],
										},
									],
								},
							],
						},
					},
				},
				saveData: {
					transactionId: "$.context.transaction_id",
					latestMessage_id: "$.context.message_id",
					latestTimestamp: "$.context.timestamp",
					bapId: "$.context.bap_id",
					bapUri: "$.context.bap_uri",
					bppId: "$.context.bpp_id",
					bppUri: "$.context.bpp_uri",
					test_form: "$.message.catalog.descriptor.name",
				},
				inputs: {},
			},
		},
		{
			api: "html_form",
			action_id: "test_form",
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
				inputs: {},
				formHtml:
					"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgPHRpdGxlPkVOVEVSIEZPUk0gVElUTEUgSEVSRTwvdGl0bGU+CjwvaGVhZD4KCjxib2R5PgogIDwhLS0gbm90ZTogdXBkYXRlIHRoZSBmb3JtIGlkIGhlcmUgYW5kIGRvbid0IGNoYW5nZSB0aGUgYWN0aW9uVXJsIHRlbXBsYXRlIC0tPgogIDxmb3JtIGlkPSJ0ZXN0X2Zvcm0iIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSI8JT0gYWN0aW9uVXJsICU+Ij4KICAgIDxsYWJlbCBmb3I9Im5hbWUiPk5hbWU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJuYW1lIiBuYW1lPSJuYW1lIiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnkiPkNvdW50cnk8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5IiBuYW1lPSJjb3VudHJ5IiAvPgoKICAgIDxsYWJlbCBmb3I9ImNvdW50cnlDb2RlIj5Db3VudHJ5IENvZGU8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJjb3VudHJ5Q29kZSIgbmFtZT0iY291bnRyeUNvZGUiIC8+CgogICAgPGxhYmVsIGZvcj0iYWdlIj5BZ2U8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJhZ2UiIG5hbWU9ImFnZSIgLz4KCiAgICA8bGFiZWwgZm9yPSJlbWFpbCI+RW1haWwgSUQ8L2xhYmVsPgogICAgPGlucHV0IHR5cGU9InRleHQiIGlkPSJlbWFpbCIgbmFtZT0iZW1haWwiIC8+CgogICAgPGxhYmVsIGZvcj0iZ2VuZGVyIj5HZW5kZXI8L2xhYmVsPgogICAgPHNlbGVjdCBuYW1lPSJnZW5kZXIiIGlkPSJnZW5kZXIiPgogICAgICA8b3B0aW9uIHZhbHVlPSJtYWxlIj5NYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9ImZlbWFsZSI+RmVtYWxlPC9vcHRpb24+CiAgICAgIDxvcHRpb24gdmFsdWU9InRyYW5zZ2VuZGVyIj5UcmFuc2dlbmRlcjwvb3B0aW9uPgogICAgPC9zZWxlY3Q+CgogICAgPGxhYmVsIGZvcj0icGhvbmVOdW1iZXIiPlBob25lIG51bWJlcjwvbGFiZWw+CiAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBob25lTnVtYmVyIiBuYW1lPSJwaG9uZU51bWJlciIgLz4KCiAgICA8bGFiZWwgZm9yPSJpZFByb29mIj5JRCBQcm9vZjwvbGFiZWw+CiAgICA8c2VsZWN0IG5hbWU9ImlkUHJvb2YiIGlkPSJpZFByb29mIj4KICAgICAgPG9wdGlvbiB2YWx1ZT0icGFzc3BvcnQiPlBhc3Nwb3J0PC9vcHRpb24+CiAgICA8L3NlbGVjdD4KCiAgICA8bGFiZWwgZm9yPSJwYXNzcG9ydE51bWJlciI+UGFzc3BvcnQgTnVtYmVyPC9sYWJlbD4KICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGFzc3BvcnROdW1iZXIiIG5hbWU9InBhc3Nwb3J0TnVtYmVyIiAvPgogIAk8IS0tIG5vdGU6IGRvIG5vdCByZW1vdmUgdGhlIHN1Ym1pdCBidXR0b24tLT4KICAgIDxpbnB1dCB0eXBlPSJzdWJtaXQiIHZhbHVlPSJTdWJtaXQiPgogIDwvZm9ybT4KPC9ib2R5PgoKPC9odG1sPg==",
			},
		},
		{
			api: "update",
			action_id: "update",
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
						timestamp: "2026-04-20T05:43:04.883Z",
						transaction_id: "937e0b33-3466-4c69-bf4d-e88cc242b68a",
						message_id: "9f860be4-8a39-440c-a4ca-c175fd5843b2",
						bap_id: "sample-bap-id",
						bap_uri: "https://bap.example.com",
						ttl: "PT30S",
						bpp_id: "sample-bpp-id",
						bpp_uri: "https://bpp.example.com",
						version: "2.0.2",
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
					sampleData: {
						email: "john.doe@example.com",
						age: 28,
						password: "SecurePass1",
						website: "https://example.com",
						country: "US",
					},
				},
			},
		},
	],
	transaction_history: [
		{
			action_id: "search",
			payload: {
				context: {
					domain: "ONDC:FIS12",
					action: "search",
					timestamp: "2026-04-20T05:58:58.811Z",
					transaction_id: "937e0b33-3466-4c69-bf4d-e88cc242b68a",
					message_id: "f2b70b50-5c1d-4cb9-b45f-e98252dbf7b1",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					version: "2.0.2",
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
			action: "search",
			saved_info: {},
		},
		{
			action_id: "on_search",
			payload: {
				context: {
					domain: "ONDC:FIS12",
					action: "on_search",
					timestamp: "2026-04-20T05:58:58.836Z",
					transaction_id: "937e0b33-3466-4c69-bf4d-e88cc242b68a",
					message_id: "f2b70b50-5c1d-4cb9-b45f-e98252dbf7b1",
					bap_id: "sample-bap-id",
					bap_uri: "https://bap.example.com",
					ttl: "PT30S",
					bpp_id: "sample-bpp-id",
					bpp_uri: "https://bpp.example.com",
					version: "2.0.2",
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
					catalog: {
						descriptor: {
							name: "undefined/forms/ONDC:FIS12/test_form/?transaction_id=937e0b33-3466-4c69-bf4d-e88cc242b68a&session_id=undefined",
						},
						providers: [
							{
								id: "gold_loan_335887d1-6673-4763-a6f2-bd78e19a5d5f",
								descriptor: {
									images: [
										{
											url: "https://www.icicibank.com/content/dam/icicibank/india/assets/images/header/logo.png",
											size_type: "sm",
										},
									],
									name: "ICICI Bank",
									short_desc: "ICICI Bank Ltd",
									long_desc: "ICICI Bank Ltd, India.",
								},
								categories: [
									{
										id: "100001",
										descriptor: {
											code: "GOLD_LOAN",
											name: "Gold Loan",
										},
									},
									{
										id: "101124",
										parent_category_id: "101123",
										descriptor: {
											code: "BUREAU_LOAN",
											name: "Bureau Loan",
										},
									},
									{
										id: "101125",
										parent_category_id: "101123",
										descriptor: {
											code: "AA_LOAN",
											name: "Account Aggregator Loan",
										},
									},
								],
								items: [
									{
										id: "gold_loan_1fca8dc5-7c63-43c9-ad65-3161348cbdd9",
										descriptor: {
											code: "LOAN",
											name: "Gold Loan without AA",
										},
										category_ids: ["101123", "101124"],
										tags: [
											{
												descriptor: {
													code: "GENERAL_INFO",
													name: "General Information",
												},
												list: [
													{
														descriptor: {
															code: "MIN_INTEREST_RATE",
															name: "Minimum Interest Rate",
															short_desc: "Loans starting from 9% (p.a)",
														},
														value: "9%",
													},
													{
														descriptor: {
															code: "MAX_INTEREST_RATE",
															name: "Maximum Interest Rate",
															short_desc: "Loan Rate below from 15% (p.a)",
														},
														value: "15%",
													},
													{
														descriptor: {
															code: "MIN_TENURE",
															name: "Minimum Tenure",
															short_desc: "Loan Tenure starting form 5 months",
														},
														value: "5 months",
													},
													{
														descriptor: {
															code: "MAX_TENURE",
															name: "Maximum Tenure",
															short_desc: "Loan Tenure upto form 5 years",
														},
														value: "5 years",
													},
													{
														descriptor: {
															code: "MIN_LOAN_AMOUNT",
															name: "Minimum Loan Amount",
															short_desc: "Loan Amount starting from 50,000",
														},
														value: "50000",
													},
													{
														descriptor: {
															code: "MAX_LOAN_AMOUNT",
															name: "Minimum Loan Amount",
															short_desc: "Loan Amount upto form 50,00,000",
														},
														value: "5000000",
													},
												],
												display: true,
											},
										],
										matched: true,
										recommended: true,
										xinput: {
											head: {
												descriptor: {
													name: "Customer Information",
												},
												index: {
													min: 0,
													cur: 0,
													max: 0,
												},
												headings: ["PERSONAL_INFORMATION"],
											},
											form: {
												id: "F01",
												mime_type: "text/html",
												url: "http://localhost:3300/forms/FIS12/consumer_information_form?session_id=9xr8WlnL34FutCjOQFCjEyHu1i6pqST8&flow_id=Gold_Loan_Pre_Part_Payment_With_Account_Aggregator&transaction_id=f7d2d945-aba7-4315-823d-64019b29a57e",
												resubmit: false,
												multiple_sumbissions: false,
											},
											required: true,
										},
									},
									{
										id: "gold_loan_728a41ed-2fa2-4ea7-890d-0060845c5ae7",
										descriptor: {
											code: "LOAN",
											name: "Gold Loan with AA",
										},
										category_ids: ["101123", "101125"],
										tags: [
											{
												descriptor: {
													code: "GENERAL_INFO",
													name: "General Information",
												},
												list: [
													{
														descriptor: {
															code: "MIN_INTEREST_RATE",
															name: "Minimum Interest Rate",
															short_desc: "Loans starting from 9% (p.a)",
														},
														value: "9%",
													},
													{
														descriptor: {
															code: "MAX_INTEREST_RATE",
															name: "Maximum Interest Rate",
															short_desc: "Loan Rate below from 15% (p.a)",
														},
														value: "15%",
													},
													{
														descriptor: {
															code: "MIN_TENURE",
															name: "Minimum Tenure",
															short_desc: "Loan Tenure starting form 5 months",
														},
														value: "5 months",
													},
													{
														descriptor: {
															code: "MAX_TENURE",
															name: "Maximum Tenure",
															short_desc: "Loan Tenure upto form 5 years",
														},
														value: "5 years",
													},
													{
														descriptor: {
															code: "MIN_LOAN_AMOUNT",
															name: "Minimum Loan Amount",
															short_desc: "Loan Amount starting from 50,000",
														},
														value: "50000",
													},
													{
														descriptor: {
															code: "MAX_LOAN_AMOUNT",
															name: "Minimum Loan Amount",
															short_desc: "Loan Amount upto form 50,00,000",
														},
														value: "5000000",
													},
												],
												display: true,
											},
										],
										matched: true,
										recommended: true,
										xinput: {
											head: {
												descriptor: {
													name: "Customer Information",
												},
												index: {
													min: 0,
													cur: 0,
													max: 0,
												},
												headings: ["PERSONAL_INFORMATION"],
											},
											form: {
												id: "F01",
												mime_type: "text/html",
												url: "http://localhost:3300/forms/FIS12/consumer_information_form?session_id=9xr8WlnL34FutCjOQFCjEyHu1i6pqST8&flow_id=Gold_Loan_Pre_Part_Payment_With_Account_Aggregator&transaction_id=f7d2d945-aba7-4315-823d-64019b29a57e",
												resubmit: false,
												multiple_sumbissions: false,
											},
											required: true,
										},
									},
								],
								payments: [
									{
										collected_by: "BPP",
										tags: [
											{
												descriptor: {
													code: "BUYER_FINDER_FEES",
												},
												display: false,
												list: [
													{
														descriptor: {
															code: "BUYER_FINDER_FEES_TYPE",
														},
														value: "PERCENT_ANNUALIZED",
													},
													{
														descriptor: {
															code: "BUYER_FINDER_FEES_PERCENTAGE",
														},
														value: "1",
													},
												],
											},
											{
												descriptor: {
													code: "SETTLEMENT_TERMS",
												},
												display: false,
												list: [
													{
														descriptor: {
															code: "SETTLEMENT_WINDOW",
														},
														value: "PT30D",
													},
													{
														descriptor: {
															code: "SETTLEMENT_BASIS",
														},
														value: "INVOICE_RECEIPT",
													},
													{
														descriptor: {
															code: "MANDATORY_ARBITRATION",
														},
														value: "TRUE",
													},
													{
														descriptor: {
															code: "COURT_JURISDICTION",
														},
														value: "New Delhi",
													},
													{
														descriptor: {
															code: "STATIC_TERMS",
														},
														value:
															"https://bpp.credit.becknprotocol.org/personal-banking/loans/gold-loan",
													},
													{
														descriptor: {
															code: "OFFLINE_CONTRACT",
														},
														value: "true",
													},
												],
											},
										],
									},
								],
								tags: [
									{
										descriptor: {
											code: "CONTACT_INFO",
											name: "Contact Info",
										},
										list: [
											{
												descriptor: {
													code: "GRO_NAME",
													name: "Gro name",
												},
												value: "ICICI",
											},
											{
												descriptor: {
													code: "GRO_EMAIL",
													name: "Gro email",
												},
												value: "lifeline@iciciprulife.com",
											},
											{
												descriptor: {
													code: "GRO_CONTACT_NUMBER",
													name: "Gro contact number",
												},
												value: "1860 266 7766",
											},
											{
												descriptor: {
													code: "CUSTOMER_SUPPORT_LINK",
													name: "Customer support link",
												},
												value:
													"https://buy.iciciprulife.com/buy/GrievanceRedStep.htm?execution=e1s1",
											},
											{
												descriptor: {
													code: "CUSTOMER_SUPPORT_CONTACT_NUMBER",
													name: "Customer support contact number",
												},
												value: "1800 1080",
											},
											{
												descriptor: {
													code: "CUSTOMER_SUPPORT_EMAIL",
													name: "Customer support email",
												},
												value: "customer.care@icicibank.com",
											},
										],
									},
									{
										descriptor: {
											code: "LSP_INFO",
											name: "Lsp Info",
										},
										list: [
											{
												descriptor: {
													code: "LSP_NAME",
													name: "Lsp name",
												},
												value: "ICICI_LSP",
											},
											{
												descriptor: {
													code: "LSP_EMAIL",
													name: "Lsp email",
												},
												value: "lsp@iciciprulife.com",
											},
											{
												descriptor: {
													code: "LSP_CONTACT_NUMBER",
													name: "Lsp contact number",
												},
												value: "1860 266 7766",
											},
											{
												descriptor: {
													code: "LSP_ADDRESS",
													name: "Lsp Address",
												},
												value:
													"One Indiabulls centre, Tower 1, 18th Floor Jupiter mill compound 841, Senapati Bapat Marg, Elphinstone Road, Mumbai 400013",
											},
										],
									},
								],
							},
						],
					},
				},
			},
			action: "on_search",
			saved_info: {},
		},
		{
			action_id: "test_form",
			payload: {
				name: "Rudransh Shinghal",
				country: "India",
				countryCode: "India",
				age: "",
				email: "rudransh.ball@gmail.com",
				gender: "male",
				phoneNumber: "08287736782",
				idProof: "passport",
				passportNumber: "",
			},
			action: "html_form",
			saved_info: {
				submissionID: "33324008-4433-4df6-aa9c-15499f475139",
			},
		},
	],
	validationLib: "",
	helperLib:
		"LyoKCUN1c3RvbSBoZWxwZXIgZnVuY3Rpb25zIGF2YWlsYWJsZSBpbiBhbGwgbW9jayBnZW5lcmF0aW9uIGZ1bmN0aW9ucy4KCXRoZXNlIGFyZSBhcHBlbmRlZCBiZWxvdyB0aGUgZ2VuZXJhdGUgZnVuY3Rpb24gZm9yIGVhY2ggc3RlcC4KKi8KCi8vIEdlbmVyYXRlcyBhIFVVSUQgdjQKZnVuY3Rpb24gdXVpZHY0KCkgewoJcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24gKGMpIHsKCSAgY29uc3QgciA9IE1hdGgucmFuZG9tKCkgKiAxNiB8IDA7CgkgIGNvbnN0IHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpOwoJICByZXR1cm4gdi50b1N0cmluZygxNik7Cgl9KTsKfQoKLy8gR2VuZXJhdGUgYSA2IGRpZ2l0IHN0cmluZyBJRApmdW5jdGlvbiBnZW5lcmF0ZTZEaWdpdElkKCkgewoJcmV0dXJuIE1hdGguZmxvb3IoMTAwMDAwICsgTWF0aC5yYW5kb20oKSAqIDkwMDAwMCkudG9TdHJpbmcoKTsKfQoKLy8gUmV0dXJucyB0aGUgY3VycmVudCBJU08gdGltZXN0YW1wCmZ1bmN0aW9uIGN1cnJlbnRUaW1lc3RhbXAoKSB7CglyZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpOwp9CgovLyBDb252ZXJ0cyBJU08gODYwMSBkdXJhdGlvbiBzdHJpbmcgdG8gdG90YWwgc2Vjb25kcwpjb25zdCBpc29EdXJUb1NlYyA9IChkdXJhdGlvbikgPT4gewogIGNvbnN0IGR1clJFID0gL1AoKGQrKVkpPygoZCspTSk/KChkKylXKT8oKGQrKUQpP1Q/KChkKylIKT8oKGQrKU0pPygoZCspUyk/LzsKICBjb25zdCBzID0gZHVyUkUuZXhlYyhkdXJhdGlvbik7CiAgaWYgKCFzKSByZXR1cm4gMDsKICAKICByZXR1cm4gKE51bWJlcihzPy5bMl0pIHx8IDApICogMzE1MzYwMDAgKwoJKE51bWJlcihzPy5bNF0pIHx8IDApICogMjYyODI4OCArCgkoTnVtYmVyKHM/Lls2XSkgfHwgMCkgKiA2MDQ4MDAgKwoJKE51bWJlcihzPy5bOF0pIHx8IDApICogODY0MDAgKwoJKE51bWJlcihzPy5bMTBdKSB8fCAwKSAqIDM2MDAgKwoJKE51bWJlcihzPy5bMTJdKSB8fCAwKSAqIDYwICsKCShOdW1iZXIocz8uWzE0XSkgfHwgMCk7Cn07Cgpjb25zdCBjcmVhdGVGb3JtVVJMID0gKGRvbWFpbixmb3JtSWQsIHNlc3Npb25EYXRhKSA9PiB7Cgljb25zdCBiYXNlVVJMID0gc2Vzc2lvbkRhdGEubW9ja0Jhc2VVcmw7Cgljb25zdCB0cmFuc2FjdGlvbklkID0gc2Vzc2lvbkRhdGEudHJhbnNhY3Rpb25JZFswXTsKCWNvbnN0IHNlc3Npb25JZCA9IHNlc3Npb25EYXRhLnNlc3Npb25JZDsKCXJldHVybiBgJHtiYXNlVVJMfS9mb3Jtcy8ke2RvbWFpbn0vJHtmb3JtSWR9Lz90cmFuc2FjdGlvbl9pZD0ke3RyYW5zYWN0aW9uSWR9JnNlc3Npb25faWQ9JHtzZXNzaW9uSWR9YDsKfQ==",
};

const converted = convertToFlowConfig(data as any);

writeFileSync("./test.json", JSON.stringify(converted, null, 2), "utf-8");
