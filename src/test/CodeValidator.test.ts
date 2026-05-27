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

describe("CodeValidator.validate — meetsRequirements return structure", () => {
	it("accepts an outer return with the full expected shape", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("ignores nested arrow helper returns inside meetsRequirements", () => {
		const code = `
			function meetsRequirements(sessionData) {
				const ok = (x) => { return x.length > 0; };
				const ids = (sessionData.items || []).filter(i => { return i.id; });
				return { valid: ok("hi"), code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("ignores nested function declaration returns inside meetsRequirements", () => {
		const code = `
			function meetsRequirements(sessionData) {
				function buildMsg(x) { return "req: " + x; }
				return { valid: false, code: 400, description: buildMsg("nope") };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("flags missing 'description' on the outer return", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return { valid: true, code: 200 };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("description"))).toBe(true);
	});

	it("flags missing 'valid' on the outer return", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return { code: 200, description: "ok" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("valid"))).toBe(true);
	});

	it("flags missing 'code' on the outer return", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return { valid: true, description: "ok" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("code"))).toBe(true);
	});

	it("flags an outer return that is not an object literal (boolean)", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return true;
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Function should return an object literal"),
			),
		).toBe(true);
	});

	it("flags an outer return that is not an object literal (string)", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return "ok";
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Function should return an object literal"),
			),
		).toBe(true);
	});

	it("accepts a minified conditional return: return c ? {...} : {...}", () => {
		const code = `function meetsRequirements(s){return s.ok?{valid:!0,code:200,description:"Requirements met"}:{valid:!1,code:400,description:"not met"}}`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("accepts multiple return paths inside if/else, both objects", () => {
		const code = `
			function meetsRequirements(sessionData) {
				if (!sessionData) {
					return { valid: false, code: 400, description: "no session" };
				}
				if (sessionData.bad) {
					return { valid: false, code: 401, description: "bad" };
				}
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("flags when one of multiple return paths is missing a property", () => {
		const code = `
			function meetsRequirements(sessionData) {
				if (!sessionData) {
					return { valid: false, code: 400 };
				}
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("description"))).toBe(true);
	});

	it("flags when one of multiple return paths is not an object", () => {
		const code = `
			function meetsRequirements(sessionData) {
				if (!sessionData) {
					return false;
				}
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Function should return an object literal"),
			),
		).toBe(true);
	});

	it("flags unexpected/extra properties on the outer return", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return { valid: true, code: 200, description: "ok", extra: "nope" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("unexpected property"))).toBe(
			true,
		);
	});

	it("does not warn 'should return a value' when meetsRequirements has a return", () => {
		const code = `
			function meetsRequirements(sessionData) {
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(
			result.warnings.some((w) => w.includes("should return a value")),
		).toBe(false);
	});

	it("warns when only a nested helper returns and meetsRequirements has no return", () => {
		const code = `
			function meetsRequirements(sessionData) {
				function helper() { return 42; }
				helper();
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(
			result.warnings.some((w) => w.includes("should return a value")),
		).toBe(true);
	});

	it("ignores sibling top-level helper returns even when they return non-objects", () => {
		const code = `
			function helper() { return 123; }
			function anotherHelper() { return "string"; }
			function meetsRequirements(sessionData) {
				const a = helper();
				const b = anotherHelper();
				return { valid: a > 0 && !!b, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("ignores returns inside try/catch helpers nested in meetsRequirements", () => {
		const code = `
			function meetsRequirements(sessionData) {
				const safe = (fn) => {
					try { return fn(); } catch (e) { return null; }
				};
				const v = safe(() => sessionData.x);
				return { valid: !!v, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("flags forbidden global usage inside meetsRequirements", () => {
		const code = `
			function meetsRequirements(sessionData) {
				eval("1+1");
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("eval"))).toBe(true);
	});

	it("flags infinite loops inside meetsRequirements", () => {
		const code = `
			function meetsRequirements(sessionData) {
				while (true) { break; }
				return { valid: true, code: 200, description: "Requirements met" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes("infinite loop"))).toBe(true);
	});

	it("accepts return inside switch branches when all branches return objects", () => {
		const code = `
			function meetsRequirements(sessionData) {
				switch (sessionData.kind) {
					case "a":
						return { valid: true, code: 200, description: "Requirements met" };
					case "b":
						return { valid: false, code: 400, description: "bad b" };
					default:
						return { valid: false, code: 400, description: "unknown" };
				}
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("errors when the function name is misspelled (meetRequirements vs meetsRequirements)", () => {
		const code = `
			function meetRequirements(sessionData) {
				if (!sessionData.selected_items) {
					return { valid: false, code: "MISSING", description: "no items" };
				}
				return { valid: true, code: "200", description: "ok" };
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes(
					"Expected a top-level function declaration named 'meetsRequirements'",
				),
			),
		).toBe(true);
		// Suppresses the older misleading "should return an object with properties" message
		expect(
			result.errors.some((e) =>
				e.includes("Function should return an object with properties"),
			),
		).toBe(false);
		// Suppresses the "should return a value" warning too
		expect(
			result.warnings.some((w) => w.includes("should return a value")),
		).toBe(false);
	});

	it("accepts return inside try/finally in meetsRequirements", () => {
		const code = `
			function meetsRequirements(sessionData) {
				try {
					return { valid: true, code: 200, description: "Requirements met" };
				} catch (e) {
					return { valid: false, code: 500, description: String(e) };
				}
			}
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});
});

describe("CodeValidator.validate — required top-level declaration name", () => {
	const getSaveSchema = getFunctionSchema("getSave");

	it("errors when 'validate' is misspelled (validatee)", () => {
		const code = `
			function validatee(targetPayload, sessionData) {
				return { valid: true, code: 200, description: "Valid request" };
			}
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Expected a top-level function declaration named 'validate'"),
			),
		).toBe(true);
	});

	it("errors when 'generate' is misspelled (genrate)", () => {
		const code = `
			async function genrate(defaultPayload, sessionData) {
				return defaultPayload;
			}
		`;
		const result = CodeValidator.validate(code, generateSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Expected a top-level function declaration named 'generate'"),
			),
		).toBe(true);
	});

	it("accepts async generate (async function declaration counts)", () => {
		const code = `
			async function generate(defaultPayload, sessionData) {
				return defaultPayload;
			}
		`;
		const result = CodeValidator.validate(code, generateSchema);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it("errors when function is defined as const arrow instead of declaration", () => {
		const code = `
			const validate = (targetPayload, sessionData) => {
				return { valid: true, code: 200, description: "Valid request" };
			};
		`;
		const result = CodeValidator.validate(code, validateSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes("Expected a top-level function declaration named 'validate'"),
			),
		).toBe(true);
	});

	it("errors when only helpers are defined and the target function is missing entirely", () => {
		const code = `
			function helper() { return 1; }
		`;
		const result = CodeValidator.validate(code, meetsRequirementsSchema);
		expect(result.isValid).toBe(false);
		expect(
			result.errors.some((e) =>
				e.includes(
					"Expected a top-level function declaration named 'meetsRequirements'",
				),
			),
		).toBe(true);
	});

	it("does NOT require a function declaration for getSave (raw code allowed)", () => {
		const code = `return payload.context.transaction_id;`;
		const result = CodeValidator.validate(code, getSaveSchema);
		expect(
			result.errors.some((e) =>
				e.includes("Expected a top-level function declaration"),
			),
		).toBe(false);
	});

	it("accepts getSave wrapped in an IIFE (no named declaration needed)", () => {
		const code = `const id = payload.context.transaction_id; return id;`;
		const result = CodeValidator.validate(code, getSaveSchema);
		expect(
			result.errors.some((e) =>
				e.includes("Expected a top-level function declaration"),
			),
		).toBe(false);
	});
});
