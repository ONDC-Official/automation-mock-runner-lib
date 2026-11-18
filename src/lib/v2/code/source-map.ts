const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodes one segment's Base64 VLQ fields. */
const decodeSegment = (segment: string): number[] => {
	const values: number[] = [];
	let value = 0;
	let shift = 0;
	for (const char of segment) {
		const digit = BASE64.indexOf(char);
		if (digit < 0) return values;
		value += (digit & 31) << shift;
		if (digit & 32) {
			shift += 5;
			continue;
		}
		values.push(value & 1 ? -(value >>> 1) : value >>> 1);
		value = 0;
		shift = 0;
	}
	return values;
};

/**
 * Maps a 1-based line of transpiled code back to its 1-based line in the
 * source, from a v3 source map (the `sourceMapText` TypeScript emits). Type
 * declarations are erased, so later code moves up; this undoes that for error
 * messages. Undefined when the map has nothing for the line.
 *
 * @experimental
 */
export const createLineMapperV2 = (sourceMap?: string) => {
	const lines = new Map<number, number>();
	if (sourceMap) {
		let mappings = "";
		try {
			mappings = JSON.parse(sourceMap).mappings ?? "";
		} catch {
			// No usable map: every lookup falls through to undefined.
		}
		let sourceLine = 0;
		mappings.split(";").forEach((group, index) => {
			let first: number | undefined;
			for (const segment of group.split(",")) {
				if (!segment) continue;
				const fields = decodeSegment(segment);
				// [generatedColumn, sourceIndex, sourceLineDelta, sourceColumnDelta, name?]
				if (fields.length < 4) continue;
				sourceLine += fields[2];
				first ??= sourceLine;
			}
			if (first !== undefined) lines.set(index + 1, first + 1);
		});
	}
	return (generatedLine: number): number | undefined =>
		lines.get(generatedLine);
};
