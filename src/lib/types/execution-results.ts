export interface ExecutionResult {
	timestamp: string;
	success: boolean;
	result?: any;
	error?: {
		message: string;
		stack?: string;
		name: string;
	};
	logs: Array<{
		type: "log" | "error" | "warn";
		message: string;
		timestamp: number;
	}>;
	executionTime?: number;
	validation: ValidationResult;
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	wrappedCode?: string;
}

export interface CodeStatistics {
	lines: number;
	functions: number;
	complexity: number;
	loops: number;
	conditionals: number;
}
