import { FunctionSchema } from "../constants/function-registry";
import { ExecutionResult } from "../types/execution-results";

export abstract class BaseCodeRunner {
	abstract execute(
		code: string,
		schema: FunctionSchema,
		args: any[]
	): Promise<ExecutionResult>;
	abstract terminate(): void;
}
