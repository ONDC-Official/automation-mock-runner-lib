import { v4 as uuidv4 } from "uuid";
import { DEFAULT_HELPER_LIB } from "../helpers";
import { BasePlaygroundConfig } from "../types/base-config";
import * as base64 from "./base64";

/** Defaults shared by every config version; each version adds its own fields. */
export function createBaseConfig(
	domain: string,
	version: string,
): BasePlaygroundConfig {
	return {
		meta: {
			domain,
			version,
			config_version: "0.0.0001",
			description: "",
			use_case_id: "",
		},
		transaction_data: {
			transaction_id: uuidv4(),
			latest_timestamp: new Date(0).toISOString(),
			bap_id: "bap.example.com",
			bap_uri: "https://bap.example.com",
			bpp_id: "bpp.example.com",
			bpp_uri: "https://bpp.example.com",
			external_session_data: {
				finvuUrl: "https://dev-automation.ondc.org/finvu",
				mockBaseUrl: "https://dev-automation.ondc.org/mock",
			},
		},
		validationLib: "",
		helperLib: base64.encode(DEFAULT_HELPER_LIB),
	};
}
