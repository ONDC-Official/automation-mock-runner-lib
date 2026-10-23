import { createBaseConfig } from "../utils/config-defaults";
import { MockPlaygroundConfigV2Type } from "./types";

/**
 * Scaffold an empty v2 (Protocol Studio) config. There is no flowId: one v2 config
 * covers every flow for a domain + version.
 *
 * @experimental
 */
export function createInitialMockConfigV2(
	domain: string,
	version: string,
): MockPlaygroundConfigV2Type {
	const base = createBaseConfig(domain, version);
	return {
		...base,
		meta: { ...base.meta, playground_version: "v2" },
	};
}
