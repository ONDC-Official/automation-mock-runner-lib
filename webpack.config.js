const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: "./src/index.ts",
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
		fallback: {
			// Polyfills for browser environment
			path: require.resolve("path-browserify"),
			os: require.resolve("os-browserify/browser"),
			crypto: require.resolve("crypto-browserify"),
			stream: require.resolve("stream-browserify"),
			buffer: require.resolve("buffer"),
			util: require.resolve("util"),
			assert: require.resolve("assert"),
			url: require.resolve("url"),
			querystring: require.resolve("querystring-es3"),
			fs: false,
			worker_threads: false, // This will be handled by BrowserRunner
		},
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./src/test/test-page.html",
			filename: "test.html",
		}),
	],
	output: {
		filename: "mock-runner.bundle.js",
		path: path.resolve(__dirname, "browser-dist"),
		library: "MockRunnerLib",
		libraryTarget: "window",
	},
};
