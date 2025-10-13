import {
	MockPlaygroundConfigType,
	MockPlaygroundConfigSchema,
} from "../types/mock-config";
import { z } from "zod";

export function validateConfigWithErrors(config: MockPlaygroundConfigType): {
	success: boolean;
	errors?: z.core.$ZodIssue[];
} {
	const result = MockPlaygroundConfigSchema.safeParse(config);
	if (result.success) {
		return { success: true };
	} else {
		return {
			success: false,
			errors: result.error.issues,
		};
	}
}
