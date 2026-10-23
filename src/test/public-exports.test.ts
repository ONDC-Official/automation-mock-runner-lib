import fs from "fs";
import path from "path";
import * as lib from "../index";

/**
 * The lib is published and has Node consumers: an export, once shipped, must
 * never disappear. `fixtures/public-exports.json` is the list as of the last
 * release; new exports are fine, missing ones fail. Regenerate the list only
 * when deliberately cutting a breaking release:
 *   WRITE_PUBLIC_EXPORTS=1 npx jest src/test/public-exports.test.ts
 */
const listFile = path.join(__dirname, "fixtures/public-exports.json");

describe("public exports", () => {
	const current = Object.keys(lib).sort();

	if (process.env.WRITE_PUBLIC_EXPORTS) {
		fs.writeFileSync(listFile, JSON.stringify(current, null, "\t") + "\n");
	}

	it("still exports everything it exported before", () => {
		const before: string[] = JSON.parse(fs.readFileSync(listFile, "utf8"));
		expect(before.filter((name) => !current.includes(name))).toEqual([]);
	});
});
