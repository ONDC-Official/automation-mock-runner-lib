/**
 * Guards the config layering: shared base ← v1 / v2.
 * - v1's public schema shape must not drift (it is published API).
 * - v2 must branch from the base, never from v1.
 */

import * as fs from "fs";
import * as path from "path";
import { MockRunner } from "../lib/MockRunner";
import {
	BaseMetaSchema,
	BasePlaygroundConfigSchema,
} from "../lib/types/base-config";
import {
	MetaSchema,
	MockPlaygroundConfigSchema,
} from "../lib/types/mock-config";
import {
	createInitialMockConfigV2,
	MetaV2Schema,
	MockPlaygroundConfigV2Schema,
	MockRunnerV2,
} from "../lib/v2";
import { createInitialMockConfig } from "../lib/configHelper";

const sortedKeys = (shape: object) => Object.keys(shape).sort();

describe("Config layering", () => {
	describe("v1 shape is unchanged", () => {
		it("MetaSchema has exactly the original v1 keys", () => {
			expect(sortedKeys(MetaSchema.shape)).toEqual(
				[
					"domain",
					"version",
					"flowId",
					"config_version",
					"description",
					"use_case_id",
					"flowName",
				].sort(),
			);
		});

		it("MockPlaygroundConfigSchema has exactly the original v1 keys", () => {
			expect(sortedKeys(MockPlaygroundConfigSchema.shape)).toEqual(
				[
					"meta",
					"transaction_data",
					"steps",
					"extra_steps",
					"transaction_history",
					"validationLib",
					"helperLib",
				].sort(),
			);
		});
	});

	describe("v1 and v2 both extend the base", () => {
		it("every base meta key exists on v1 and v2 meta", () => {
			for (const key of Object.keys(BaseMetaSchema.shape)) {
				expect(MetaSchema.shape).toHaveProperty(key);
				expect(MetaV2Schema.shape).toHaveProperty(key);
			}
		});

		it("every base config key exists on v1 and v2 configs", () => {
			for (const key of Object.keys(BasePlaygroundConfigSchema.shape)) {
				expect(MockPlaygroundConfigSchema.shape).toHaveProperty(key);
				expect(MockPlaygroundConfigV2Schema.shape).toHaveProperty(key);
			}
		});

		it("v2 meta has the flag and no per-flow fields", () => {
			expect(MetaV2Schema.shape).toHaveProperty("playground_version");
			expect(MetaV2Schema.shape).not.toHaveProperty("flowId");
			expect(MetaV2Schema.shape).not.toHaveProperty("flowName");
			expect(MetaSchema.shape).not.toHaveProperty("playground_version");
		});

		it("each version's schema rejects the other version's config", () => {
			const v1 = createInitialMockConfig("ONDC:TRV14", "2.0.0", "flow");
			const v2 = createInitialMockConfigV2("ONDC:TRV14", "2.0.0");
			expect(MockPlaygroundConfigSchema.safeParse(v1).success).toBe(true);
			expect(MockPlaygroundConfigV2Schema.safeParse(v2).success).toBe(true);
			expect(MockPlaygroundConfigSchema.safeParse(v2).success).toBe(false);
			expect(MockPlaygroundConfigV2Schema.safeParse(v1).success).toBe(false);
		});

		it("v1 and v2 share base defaults", () => {
			const v1 = createInitialMockConfig("ONDC:TRV14", "2.0.0", "flow");
			const v2 = createInitialMockConfigV2("ONDC:TRV14", "2.0.0");
			expect(v2.transaction_data).toEqual(v1.transaction_data);
			expect(v2.helperLib).toBe(v1.helperLib);
			expect(v2.meta.config_version).toBe(v1.meta.config_version);
		});
	});

	it("v1 and v2 base64 helpers are byte-identical", () => {
		const src = "function generate() { return '₹ ✓ — ok'; }";
		expect(MockRunnerV2.encodeBase64(src)).toBe(MockRunner.encodeBase64(src));
		expect(MockRunnerV2.decodeBase64(MockRunner.encodeBase64(src))).toBe(src);
	});

	it("no v2 module imports a v1 module", () => {
		const v2Dir = path.join(__dirname, "../lib/v2");
		// Any depth of `../`: modules in v2 subfolders reach v1 as `../../MockRunner`.
		const v1Modules =
			/from\s+["'](\.\.\/)+(MockRunner|configHelper|types\/mock-config)["']/;
		// A hand-rolled walk: `readdirSync({ recursive })` needs Node 18.17, CI runs 16.
		const walk = (dir: string): string[] =>
			fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
				const rel = path.join(dir, entry.name);
				return entry.isDirectory() ? walk(rel) : [rel];
			});
		const files = walk(v2Dir)
			.map((file) => path.relative(v2Dir, file))
			.filter((file) => file.endsWith(".ts"))
			.sort();
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const source = fs.readFileSync(path.join(v2Dir, file), "utf8");
			expect({ file, importsV1: v1Modules.test(source) }).toEqual({
				file,
				importsV1: false,
			});
		}
	});
});
