import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { signIn } from "@auth/sveltekit/client";
import SignInButton from "./SignInButton.svelte";

vi.mock("$lib/util/ui/theme.svelte", () => ({ getTheme: () => "light" }));
vi.mock("@auth/sveltekit/client", () => ({ signIn: vi.fn(async () => {}) }));
vi.mock("$lib/util/editor/editor.svelte", () => ({
	graphManager: {
		getGraphData: () => ({ components: {}, wires: {}, nextId: 7 }),
	},
}));

beforeEach(() => {
	sessionStorage.clear();
	vi.clearAllMocks();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it("stores the circuit and save return intent before signing in", async () => {
	render(SignInButton, { provider: "google", source: "saveModal" });
	await fireEvent.click(
		screen.getByRole("button", { name: /Continue with Google/ }),
	);
	expect(sessionStorage.getItem("signInSource")).toBe("saveModal");
	expect(JSON.parse(sessionStorage.getItem("currentCircuit")!)).toEqual({
		components: {},
		wires: {},
		nextId: 7,
	});
	expect(signIn).toHaveBeenCalledExactlyOnceWith("google");
});

it("keeps the user on the circuit and shows feedback when storage is denied", async () => {
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new Error("denied");
	});
	render(SignInButton, { provider: "google", source: "saveModal" });
	await fireEvent.click(
		screen.getByRole("button", { name: /Continue with Google/ }),
	);
	expect(signIn).not.toHaveBeenCalled();
	expect(screen.getByRole("alert").textContent).toContain(
		"Allow browser storage",
	);
});
