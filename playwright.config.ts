import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "./.dev.vars" });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

type WebServer = ReturnType<typeof defineConfig>["webServer"];

// Create a unique uuid for each test run
// to differentiate users in tests
import { v4 as uuidv4 } from "uuid";
const testId = uuidv4();

export default defineConfig({
	testDir: "./playwright",
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: 1,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: "html",
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.CI ? "http://localhost:8788" : "http://localhost:5173",

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: {
				contextOptions: {
					permissions: ["clipboard-read", "clipboard-write"],
				},
				...devices["Desktop Chrome"],
				userAgent:
					`client_chrome_${testId} ` + devices["Desktop Chrome"].userAgent,
			},
			testIgnore: "**/mobile/**",
		},

		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"],
				userAgent:
					`client_firefox_${testId} ` + devices["Desktop Chrome"].userAgent,
			},
			testIgnore: "**/mobile/**",
		},

		{
			name: "webkit",
			use: {
				...devices["Desktop Safari"],
				userAgent:
					`client_safari_${testId} ` + devices["Desktop Chrome"].userAgent,
			},
			testIgnore: "**/mobile/**",
		},

		// {
		// 	name: "Mobile Chrome",
		// 	use: {
		// 		...devices["Pixel 5"],
		// 		contextOptions: {
		// 			permissions: ["clipboard-read", "clipboard-write"],
		// 		},
		// 		viewport: devices["Desktop Chrome"].viewport,
		// 	},
		// 	testDir: "./playwright/mobile",
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		// },
	],

	/* Run your local dev server before starting the tests */
	webServer: (() => {
		const servers: WebServer = [
			{
				// OAuth2 mock server
				command: "npm run oauth",
				url: "http://localhost:8080/userinfo",
				reuseExistingServer: !process.env.CI,
			},
		];
		if (process.env.CI) {
			servers.push({
				// local D1 database server
				command: "npm run db",
				url: "http://127.0.0.1:8788",
				reuseExistingServer: !process.env.CI,
			});
		}
		return servers;
	})(),
});
