import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest-setup.js"],

		// default values from https://vitest.dev/config/
		exclude: [
			// Default
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{playwright,svelte,karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
			// Custom
			"**/playwright/**", // Playwright tests
		],
		coverage: {
			exclude: [
				// Default
				"coverage/**",
				"dist/**",
				"**/node_modules/**",
				"**/[.]**",
				"packages/*/test?(s)/**",
				"**/*.d.ts",
				"**/virtual:*",
				"**/__x00__*",
				"**/\x00*",
				"cypress/**",
				"test?(s)/**",
				"test?(-*).?(c|m)[jt]s?(x)",
				"**/*{.,-}{test,spec,bench,benchmark}?(-d).?(c|m)[jt]s?(x)",
				"**/__tests__/**",
				"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
				"**/vitest.{workspace,projects}.[jt]s?(on)",
				"**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}",
				// Custom
				"**/{playwright,svelte}.config.*",
				"**/playwright/**",
			],
		},
	},
	// Enable this to test the clipboard functionality on mobile devices
	// The `navigator.clipboard` API needs https or localhost,
	// so when testing on mobile devices, you need to enable https.
	// Create a new certificate (input details don't matter) with:
	// `openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes`
	// Then visit `https://<your computer's IP>:5173` on your mobile device,
	// click through all the warnings, and voilà, the clipboard should work (hopefully)!
	// server: {
	// 	https: {
	// 		key: fs.readFileSync("./key.pem"),
	// 		cert: fs.readFileSync("./cert.pem"),
	// 	},
	// 	host: true, // Allow access from network
	// },
});
