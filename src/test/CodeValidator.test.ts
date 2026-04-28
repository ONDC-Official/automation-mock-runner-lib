import { CodeValidator } from "../lib/validators/code-validator";
import { getFunctionSchema } from "../lib/constants/function-registry";

const validateSchema = getFunctionSchema("validate");

describe("CodeValidator.validate — return structure", () => {
	it("accepts an outer return with the full expected shape", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				return { valid: false, code: 200, description: "Valid request" };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("ignores nested arrow helper returns (regression: false positive on nested non-object returns)", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				const ok = (x) => { return x.length > 0; };
				const items = (targetPayload.items || []).filter(i => { return i.id; });
				return { valid: ok("hi"), code: 200, description: "Valid request" };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("ignores nested function declaration returns", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				function getMsg(x) { return "msg: " + x; }
				return { valid: false, code: 200, description: getMsg("ok") };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("flags missing properties on the outer return", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				return { valid: true, code: 200 };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("description"))).toBe(true);
	});

	it("flags an outer return that is not an object literal", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				return true;
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Function should return an object literal"),
			),
		).toBe(true);
	});

	it("warns when only a nested helper returns and the outer function has no return", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				function helper() { return 42; }
				helper();
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(
			result.warnings.some((w) => w.includes("should return a value")),
		).toBe(true);
	});
});
