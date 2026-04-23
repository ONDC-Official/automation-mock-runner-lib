import * as defaultHelperFns from "./default-helpers";

const HEADER = `/*
	Custom helper functions available in all mock generate() functions.
	Assembled from src/lib/helpers/default-helpers.js — edit there.
*/`;

export const DEFAULT_HELPER_LIB: string = [
	HEADER,
	...Object.values(defaultHelperFns)
		.filter((v): v is (...args: any[]) => any => typeof v === "function")
		.map((f) => f.toString()),
].join("\n\n");
