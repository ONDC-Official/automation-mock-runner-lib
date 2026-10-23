import z from "zod";
import {
	MockPlaygroundConfigV2Schema,
	MockPlaygroundConfigV2Type,
} from "./types";

export function validateConfigV2WithErrors(
	config: MockPlaygroundConfigV2Type,
): {
	success: boolean;
	errors?: z.core.$ZodIssue[];
} {
	const result = MockPlaygroundConfigV2Schema.safeParse(config);
	if (result.success) {
		return { success: true };
	} else {
		return { success: false, errors: result.error.issues };
	}
}
