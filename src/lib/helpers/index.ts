import { DEFAULT_HELPERS_RAW } from "./default-helpers-source";

const HEADER = `/*
	Custom helper functions available in all mock generate() functions.
	Source: src/lib/helpers/default-helpers.js — edit there, then run
	\`npm run helpers:gen\` to refresh.
*/`;

export const DEFAULT_HELPER_LIB: string = HEADER + "\n\n" + DEFAULT_HELPERS_RAW;
