/**
 * Cheap discriminator on `meta.playground_version` — tells a v2 config apart
 * from a v1 one (which has no flag) without validating it.
 */
export function isPlaygroundV2Config(value: unknown): boolean {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const meta = (value as { meta?: unknown }).meta;
	return (
		typeof meta === "object" &&
		meta !== null &&
		(meta as { playground_version?: unknown }).playground_version === "v2"
	);
}
