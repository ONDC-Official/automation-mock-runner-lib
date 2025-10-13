// lib/code-runner/code-validator.ts

import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { FunctionSchema } from "../constants/function-registry";
import { CodeStatistics, ValidationResult } from "../types/execution-results";

export class CodeValidator {
	private static FORBIDDEN_GLOBALS = [
		"eval",
		"Function",
		"importScripts",
		"Worker",
		"SharedWorker",
		"WebSocket",
		"XMLHttpRequest",
		"fetch",
	];

	private static FORBIDDEN_PROPERTIES = [
		"localStorage",
		"sessionStorage",
		"indexedDB",
		"webkitStorageInfo",
		"__proto__",
	];

	/**
	 * Get code statistics
	 */
	static getCodeStatistics(code: string): CodeStatistics {
		const stats: CodeStatistics = {
			lines: code.split("\n").length,
			functions: 0,
			complexity: 1,
			loops: 0,
			conditionals: 0,
		};

		try {
			const ast = acorn.parse(code, {
				ecmaVersion: 2020,
				sourceType: "script",
			});

			walk.simple(ast, {
				FunctionDeclaration() {
					stats.functions++;
				},
				FunctionExpression() {
					stats.functions++;
				},
				ArrowFunctionExpression() {
					stats.functions++;
				},
				WhileStatement() {
					stats.loops++;
					stats.complexity++;
				},
				DoWhileStatement() {
					stats.loops++;
					stats.complexity++;
				},
				ForStatement() {
					stats.loops++;
					stats.complexity++;
				},
				ForInStatement() {
					stats.loops++;
					stats.complexity++;
				},
				ForOfStatement() {
					stats.loops++;
					stats.complexity++;
				},
				IfStatement() {
					stats.conditionals++;
					stats.complexity++;
				},
				ConditionalExpression() {
					stats.conditionals++;
					stats.complexity++;
				},
				SwitchCase(node: any) {
					if (node.test) {
						stats.conditionals++;
						stats.complexity++;
					}
				},
				LogicalExpression(node: any) {
					if (node.operator === "||" || node.operator === "&&") {
						stats.complexity++;
					}
				},
			});
		} catch (e) {
			// Ignore parse errors, return partial stats
			console.error("Error parsing code for statistics:", e);
		}

		return stats;
	}

	/**
	 * Main validation method - now handles function bodies
	 */
	static validate(
		functionBody: string,
		schema: FunctionSchema
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 1. Wrap the body with function declaration
		const wrappedCode = functionBody;
		// const wrappedCode = schema.template(functionBody);

		try {
			// 2. Parse complete code into AST
			const ast = acorn.parse(wrappedCode, {
				ecmaVersion: 2020,
				sourceType: "script",
				locations: true,
			});

			// 3. Security analysis on the complete code
			const securityIssues = this.analyzeSecurityIssues(ast);
			securityIssues.forEach((issue) => {
				errors.push(`[Line ${issue.line}] ${issue.message}`);
			});

			// 4. Check for dangerous patterns
			const dangerousPatterns = this.detectDangerousPatterns(ast);
			dangerousPatterns.forEach((pattern) => {
				errors.push(`[Line ${pattern.line}] ${pattern.message}`);
			});

			// 5. Validate return type structure (for validate and meetsRequirements)
			if (schema.returnType.properties) {
				const returnValidation = this.validateReturnStructure(
					ast,
					schema.returnType.properties
				);
				errors.push(...returnValidation);
			}

			// 6. Check for best practices
			const practiceWarnings = this.checkBestPractices(ast, schema);
			warnings.push(...practiceWarnings);
		} catch (e: any) {
			// Syntax error during parsing
			let errorMessage = `Syntax Error: ${e.message}`;

			// Try to extract line number and adjust for function body
			const lineMatch = e.message.match(/\((\d+):(\d+)\)/);
			if (lineMatch) {
				const line = parseInt(lineMatch[1]);
				const col = lineMatch[2];
				// Subtract the number of lines in the template before the body
				const templateLines = schema.template("").split("\n").length - 1;
				const actualLine = Math.max(1, line - templateLines);
				errorMessage = `Syntax Error at line ${actualLine}, column ${col}: ${
					e.message.split("(")[0]
				}`;
			}

			errors.push(errorMessage);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			wrappedCode: errors.length === 0 ? wrappedCode : undefined,
		};
	}

	/**
	 * Validate that return statements match expected structure
	 */
	private static validateReturnStructure(
		ast: acorn.Node,
		expectedProperties: Record<string, { type: string; description: string }>
	): string[] {
		const warnings: string[] = [];
		const foundReturns: any[] = [];

		walk.simple(ast, {
			ReturnStatement(node: any) {
				if (node.argument) {
					foundReturns.push(node.argument);
				}
			},
		});

		// Check if we have return statements
		if (foundReturns.length === 0) {
			warnings.push(
				`Function should return an object with properties: ${Object.keys(
					expectedProperties
				).join(", ")}`
			);
			return warnings;
		}

		// Check the structure of returned objects
		foundReturns.forEach((returnArg) => {
			if (returnArg.type === "ObjectExpression") {
				const returnedProps = new Set(
					returnArg.properties.map((p: any) => p.key.name)
				);
				const expectedProps = Object.keys(expectedProperties);

				// Check for missing properties
				expectedProps.forEach((prop) => {
					if (!returnedProps.has(prop)) {
						warnings.push(
							`Return object is missing property '${prop}' (expected: ${expectedProperties[prop].type})`
						);
					}
				});

				// Check for extra properties
				returnedProps.forEach((prop) => {
					if (!expectedProps.includes(prop as any)) {
						warnings.push(`Return object has unexpected property '${prop}'`);
					}
				});
			} else {
				warnings.push(
					`Function should return an object literal with properties: ${Object.keys(
						expectedProperties
					).join(", ")}`
				);
			}
		});

		return warnings;
	}

	/**
	 * Security analysis - checks for forbidden functions and properties
	 */
	private static analyzeSecurityIssues(ast: acorn.Node): Array<{
		type: string;
		message: string;
		line: number;
		column: number;
	}> {
		const issues: Array<{
			type: string;
			message: string;
			line: number;
			column: number;
		}> = [];

		walk.simple(ast, {
			CallExpression(node: any) {
				if (node.callee.type === "Identifier") {
					const name = node.callee.name;
					if (CodeValidator.FORBIDDEN_GLOBALS.includes(name)) {
						issues.push({
							type: "forbidden_function",
							message: `Forbidden function call: ${name}()`,
							line: node.loc?.start.line || 0,
							column: node.loc?.start.column || 0,
						});
					}
				}
			},

			NewExpression(node: any) {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "Function"
				) {
					issues.push({
						type: "function_constructor",
						message: "Using Function constructor is forbidden",
						line: node.loc?.start.line || 0,
						column: node.loc?.start.column || 0,
					});
				}
			},

			MemberExpression(node: any) {
				if (node.property.type === "Identifier") {
					const propName = node.property.name;
					if (CodeValidator.FORBIDDEN_PROPERTIES.includes(propName)) {
						issues.push({
							type: "forbidden_property",
							message: `Access to '${propName}' is forbidden`,
							line: node.loc?.start.line || 0,
							column: node.loc?.start.column || 0,
						});
					}
				}
			},
		});

		return issues;
	}

	/**
	 * Detect dangerous patterns like infinite loops
	 */
	private static detectDangerousPatterns(ast: acorn.Node): Array<{
		type: string;
		message: string;
		line: number;
	}> {
		const issues: Array<{ type: string; message: string; line: number }> = [];

		walk.simple(ast, {
			WhileStatement(node: any) {
				if (node.test.type === "Literal" && node.test.value === true) {
					issues.push({
						type: "infinite_loop",
						message: "Potential infinite loop: while(true)",
						line: node.loc?.start.line || 0,
					});
				}
			},

			ForStatement(node: any) {
				if (!node.test) {
					issues.push({
						type: "infinite_loop",
						message: "Potential infinite loop: for(;;)",
						line: node.loc?.start.line || 0,
					});
				}
			},

			WithStatement(node: any) {
				issues.push({
					type: "with_statement",
					message: "'with' statement is forbidden",
					line: node.loc?.start.line || 0,
				});
			},
		});

		return issues;
	}

	/**
	 * Check for best practices
	 */
	private static checkBestPractices(
		ast: acorn.Node,
		schema: FunctionSchema
	): string[] {
		const warnings: string[] = [];
		let hasReturn = false;

		walk.simple(ast, {
			ReturnStatement() {
				hasReturn = true;
			},
		});

		if (!hasReturn) {
			warnings.push(
				`Function should return a value (expected: ${schema.returnType.description})`
			);
		}

		return warnings;
	}
}
