// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/**/*.test.ts"], // Automatically find test files ending in .test.ts
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/*.test.ts",
		"!src/test/**",
		"!src/types/**",
		"!src/constants/**",
		"!src/index.ts",
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
	verbose: true,
	forceExit: true,
	clearMocks: true,
	// Increase timeout for worker-based tests
	testTimeout: 10000,
	// Simple fix: just mock uuid for tests
	moduleNameMapper: {
		"^uuid$": "<rootDir>/src/test/__mocks__/uuid.ts",
	},
	// Global setup for browser environment mocking
	globals: {
		"ts-jest": {
			tsconfig: {
				target: "es2020",
				module: "commonjs",
				moduleResolution: "node",
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
				lib: ["es2020", "dom"],
				types: ["node", "jest"],
			},
		},
	},
};
