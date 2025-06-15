import { spawnSync } from "child_process";

// Node 23+ has experimental support for stripping types
// from TypeScript files enabled by default.
// This needs to be disabled as it still does not support
// all TypeScript features and causes issues with Playwright tests.
// This script adds the `--no-experimental-strip-types` flag
// when running Playwright tests if the Node version is 23 or higher.
// See https://github.com/microsoft/playwright/issues/34263

const isAffected = parseInt(process.version.slice(1, 3)) >= 23;
const playwrightExec = "node_modules/playwright/cli.js";
const stripTypes = "--no-experimental-strip-types";

function runPlaywright(args) {
	const nodeArgs = isAffected ? [stripTypes] : [];
	spawnSync("node", [...nodeArgs, playwrightExec, "test", ...args], {
		shell: true,
		stdio: "inherit",
	});
}

runPlaywright(process.argv.slice(2));