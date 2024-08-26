import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { svelteTesting } from "@testing-library/svelte/vite";

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest-setup.js"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
			// Custom
			"**/playwright/**", // Playwright tests
		],
	},
});
