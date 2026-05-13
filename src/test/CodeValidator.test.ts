import { CodeValidator } from "../lib/validators/code-validator";
import { getFunctionSchema } from "../lib/constants/function-registry";

const validateSchema = getFunctionSchema("validate");
const meetsRequirementsSchema = getFunctionSchema("meetsRequirements");
const generateSchema = getFunctionSchema("generate");

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

	it("accepts a minified conditional return: return i ? {...} : {...}", () => {
		const code = `function validate(i,d){return i?{valid:!0,code:200,description:"Valid request"}:{valid:!1,code:200,description:"oh no"}}`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("ignores sibling top-level helper function returns (validate)", () => {
		const code = `
			function x() {
				return "hello";
			}
			function validate(targetPayload, sessionData) {
				let some = x();
				return { valid: true, code: 200, description: "Valid request" };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("does not warn 'should return a value' when target fn has a return (validate)", () => {
		const code = `
			function validate(targetPayload, sessionData) {
				return { valid: true, code: 200, description: "Valid request" };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(
			result.warnings.some((w) => w.includes("should return a value"))
		).toBe(false);
	});

	it("does not warn 'should return a value' for generate with a return", () => {
		const code = `
			async function generate(defaultPayload, sessionData) {
				return defaultPayload;
			}
		`;
		const result = CodeValidator.validate(code, generateSchema);
		expect(
			result.warnings.some((w) => w.includes("should return a value"))
		).toBe(false);
		expect(result.isValid).toBe(true);
	});

	it("ignores sibling top-level helper function returns (meetsRequirements)", () => {
		const code = `
			function helper() {
				return 123;
			}
			function meetsRequirements(sessionData) {
				const n = helper();
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
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
