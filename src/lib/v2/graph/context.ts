import type { TransactionData } from "../../types/base-config";

// Must produce exactly what v1's `MockRunner.generateContext` produces for the
// same inputs (`v2-graph-executor.test.ts` checks it): the shape of `context`
// is what the api-service validates.

/** @experimental */
export interface BuildContextInputV2 {
	domain: string;
	/** The spec version: 1.x gets `country` / `city` / `core_version`, 2+ gets `version` / `location`. */
	version: string;
	action: string;
	transactionId: string;
	messageId: string;
	/** Session data, for `bapId` / `bppId` / `bapUri` / `bppUri` / `city_code` (a string, or a match list). */
	sessionData?: Record<string, unknown>;
	/** Fallbacks for the ids and uris. */
	transactionData?: Partial<TransactionData>;
	/** Defaults to now. */
	timestamp?: string;
}

/** v1's `getIdFromSession`: a string, or the first of a match list. */
export const getIdFromSessionV2 = (
	sessionData: Record<string, unknown> | undefined,
	key: string,
): string | undefined => {
	if (sessionData === undefined) return undefined;
	const data = sessionData[key];
	if (Array.isArray(data) && data.length > 0) return data[0] as string;
	if (typeof data === "string") return data;
	return undefined;
};

/** @experimental */
export function buildContextV2({
	domain,
	version,
	action,
	transactionId,
	messageId,
	sessionData,
	transactionData,
	timestamp,
}: BuildContextInputV2): Record<string, unknown> {
	const bapId =
		getIdFromSessionV2(sessionData, "bapId") || transactionData?.bap_id || "";
	const bppId =
		getIdFromSessionV2(sessionData, "bppId") || transactionData?.bpp_id || "";
	const bapUri =
		getIdFromSessionV2(sessionData, "bapUri") || transactionData?.bap_uri || "";
	const bppUri =
		getIdFromSessionV2(sessionData, "bppUri") || transactionData?.bpp_uri || "";

	const baseContext: Record<string, unknown> = {
		domain,
		action,
		timestamp: timestamp ?? new Date().toISOString(),
		transaction_id: transactionId,
		message_id: messageId,
		bap_id: bapId,
		bap_uri: bapUri,
		ttl: "PT30S",
	};
	if (action !== "search") {
		baseContext.bpp_id = bppId;
		baseContext.bpp_uri = bppUri;
	}

	const majorVersion = parseInt((version || "2.0.0").split(".")[0], 10);
	const cityCode = getIdFromSessionV2(sessionData, "city_code") ?? "*";

	if (majorVersion === 1) {
		return {
			...baseContext,
			country: "IND",
			city: cityCode,
			core_version: version,
		};
	}
	return {
		...baseContext,
		version,
		location: { country: { code: "IND" }, city: { code: cityCode } },
	};
}
