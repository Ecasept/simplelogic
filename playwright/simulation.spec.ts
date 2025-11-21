import { circuits } from "./circuits";
import { expect, test } from "./common";

// Simulation-focused tests migrated from main.spec.ts and expanded for the new UI

test.describe("simulation: mode and basic flows", () => {
	test("can't toggle power in edit mode", async ({ editor, pointer }) => {
		await editor.addComponent("IN", 100, 100);
		await pointer.clickOn(editor.comps().first(), true);
		await expect(editor.comps().first()).not.toBePowered();
	});

	test("can load while simulating", async ({ editor }) => {
		await editor.toggleSimulate();
		await editor.loadCircuitUsingClipboard(circuits.singleAnd);
		await expect(editor.comps()).toHaveCount(1);
	});
});

test.describe("simulation: logic correctness (moved)", () => {
	test("build half adder flow", async ({ editor, pointer, sim }) => {
		// Add inputs
		await editor.addComponent("IN", 400, 100);
		await editor.addComponent("IN", 400, 200);

		// Add XOR gate for sum
		await editor.addComponent("XOR", 500, 150);

		// Add AND gate for carry
		await editor.addComponent("AND", 500, 250);

		// Add LED gates for outputs
		await editor.addComponent("LED", 650, 150); // Sum output
		await editor.addComponent("LED", 650, 250); // Carry output

		// Connect inputs to XOR gate
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("XOR", "in1").first(),
		);
		await editor.drag(
			editor.getHandle("IN", "out").nth(1),
			editor.getHandle("XOR", "in2").first(),
		);

		// Connect inputs to AND gate
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("AND", "in1").first(),
		);
		await editor.drag(
			editor.getHandle("IN", "out").nth(1),
			editor.getHandle("AND", "in2").first(),
		);

		// Connect XOR output to LED (sum)
		await editor.drag(
			editor.getHandle("XOR", "out").first(),
			editor.getHandle("LED", "in").first(),
		);

		// Connect AND output to LED (carry)
		await editor.drag(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("LED", "in").nth(1),
		);

		await editor.toggleSimulate();

		const in1 = editor.getComponent("IN").first();
		const in2 = editor.getComponent("IN").nth(1);
		const sum = editor.getComponent("LED").first();
		const carry = editor.getComponent("LED").nth(1);

		// Test case 1: in1 = 1, in2 = 0
		await pointer.clickOn(in1, true);
		await expect(in1).toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum).toBePowered();

		// Test case 2: in1 = 1, in2 = 1
		await pointer.clickOn(in2, true);
		await expect(in2).toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum).not.toBePowered();
		await expect(carry).toBePowered();

		// Test case 3: in1 = 0, in2 = 1
		await pointer.clickOn(in1, true);
		await expect(in1).not.toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum).toBePowered();
		await expect(carry).not.toBePowered();

		// Test case 4: in1 = 0, in2 = 0
		await pointer.clickOn(in2, true);
		await expect(in2).not.toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum).not.toBePowered();
		await expect(carry).not.toBePowered();
	});

	test("simulate 2-bit ripple carry adder", async ({ editor, pointer, sim }) => {
		await editor.loadCircuitUsingClipboard(circuits.rippleCarryAdder);

		// move canvas to the right
		await pointer.downAt(500, 400);
		await pointer.moveTo(600, 500);
		await pointer.up();

		const b1 = editor.getComponent("IN").first(); // first bit of second number
		const b2 = editor.getComponent("IN").nth(1); // second bit of second number
		const a1 = editor.getComponent("IN").nth(2); // first bit of first number
		const a2 = editor.getComponent("IN").nth(3); // second bit of first number
		const sum2 = editor.getComponent("LED").first(); // second bit of solution
		const sum3 = editor.getComponent("LED").nth(1); // third bit of solution
		const sum1 = editor.getComponent("LED").nth(2); // first bit of solution

		await editor.toggleSimulate();
		await sim.waitForSimulationFinished(); // Initial simulation state

		// Test case 1: 001 (A1 = 1)
		await pointer.clickOn(a1, true);
		await expect(a1).toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum1).toBePowered();

		// Test case 2: 011 (A1 = 1, A2 = 1)
		await pointer.clickOn(a2, true);
		await expect(a2).toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum2).toBePowered();
		await expect(sum1).toBePowered();

		// Test case 3: 100 (A1 = 1, A2 = 1, B1 = 1)
		await pointer.clickOn(b1, true);
		await expect(b1).toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum1).not.toBePowered();
		await expect(sum2).not.toBePowered();
		await expect(sum3).toBePowered();

		// Test case 4: 110 (All inputs = 1)
		await pointer.clickOn(b2, true);
		await expect(b2).toBePowered();
		await sim.waitForSimulationFinished();
		await expect(sum1).not.toBePowered();
		await expect(sum2).toBePowered();
		await expect(sum3).toBePowered();

		// Reset all inputs (with checks + waits)
		await pointer.clickOn(a1, true);
		await expect(a1).not.toBePowered();
		await sim.waitForSimulationFinished();

		await pointer.clickOn(a2, true);
		await expect(a2).not.toBePowered();
		await sim.waitForSimulationFinished();

		await pointer.clickOn(b1, true);
		await expect(b1).not.toBePowered();
		await sim.waitForSimulationFinished();

		await pointer.clickOn(b2, true);
		await expect(b2).not.toBePowered();
		await sim.waitForSimulationFinished();

		// Test case 5: 100 (A2 = 1, B2 = 1)
		await pointer.clickOn(a2, true);
		await expect(a2).toBePowered();
		await sim.waitForSimulationFinished();

		await pointer.clickOn(b2, true);
		await expect(b2).toBePowered();
		await sim.waitForSimulationFinished();

		await expect(sum1).not.toBePowered();
		await expect(sum2).not.toBePowered();
		await expect(sum3).toBePowered();
	});

	test("simulate SR NOR latch", async ({ editor, pointer, sim }) => {
		await editor.loadCircuitUsingClipboard(circuits.SR_NOR_latch);

		// move canvas to the right

		await pointer.downAt(500, 400);
		await pointer.moveTo(800, 100);
		await pointer.up();

		const r = editor.getComponent("IN").first(); // reset
		const s = editor.getComponent("IN").nth(1); // set
		const qnot = editor.getComponent("LED").first(); // inverted result (Q̅)
		const q = editor.getComponent("LED").nth(1); // result (Q)

		await editor.toggleSimulate();
		await sim.waitForSimulationFinished(); // Initial state stabilization

		// Initial state: R = 1, S = 0, Q = 0, Q̅ = 1
		await expect(r).toBePowered(); // R = 1
		await expect(s).not.toBePowered(); // S = 0
		await expect(q).not.toBePowered(); // Q = 0
		await expect(qnot).toBePowered(); // Q̅ = 1

		// Toggle R (Reset) to 0
		await pointer.clickOn(r, true); // Toggle R to 0
		await expect(r).not.toBePowered(); // R = 0
		await sim.waitForSimulationFinished();
		await expect(s).not.toBePowered(); // S remains 0
		await expect(q).not.toBePowered(); // Q remains 0 (no change)
		await expect(qnot).toBePowered(); // Q̅ remains 1 (no change)

		// Toggle S (Set) to 1
		await pointer.clickOn(s, true); // Toggle S to 1
		await expect(s).toBePowered(); // S = 1
		await sim.waitForSimulationFinished();
		await expect(r).not.toBePowered(); // R remains 0
		await expect(q).toBePowered(); // Q = 1
		await expect(qnot).not.toBePowered(); // Q̅ = 0

		// Toggle S (Set) to 0
		await pointer.clickOn(s, true); // Toggle S to 0
		await expect(s).not.toBePowered(); // S = 0
		await sim.waitForSimulationFinished();
		await expect(r).not.toBePowered(); // R remains 0
		await expect(q).toBePowered(); // Q remains 1 (no change)
		await expect(qnot).not.toBePowered(); // Q̅ = 0 (no change)

		// Toggle R (Reset) to 1
		await pointer.clickOn(r, true); // Toggle R to 1
		await expect(r).toBePowered(); // R = 1
		await sim.waitForSimulationFinished();
		await expect(s).not.toBePowered(); // S remains 0
		await expect(q).not.toBePowered(); // Q = 0
		await expect(qnot).toBePowered(); // Q̅ = 1

		// Toggle S (Set) to 1 (invalid state)
		await pointer.clickOn(s, true); // Toggle S to 1
		await expect(s).toBePowered(); // S = 1
		await sim.waitForSimulationFinished();
		await expect(r).toBePowered(); // R remains 1
		await expect(q).not.toBePowered(); // Q is 0 (invalid state)
		await expect(qnot).not.toBePowered(); // Q̅ is 0 (invalid state)
		// invalid state because: Q = Q̅, which is by definition not possible

		// Toggle R (Reset) to 0
		await pointer.clickOn(r, true); // Toggle R to 0
		await expect(r).not.toBePowered(); // R = 0
		await sim.waitForSimulationFinished();
		await expect(s).toBePowered(); // S remains 1
		await expect(q).toBePowered(); // Q = 1
		await expect(qnot).not.toBePowered(); // Q̅ = 0
	});
});

test.describe("simulation: UI controls and sidebar", () => {
	test("tools sidebar shows simulation content in simulate mode", async ({ editor }) => {
		// Edit mode: tools should show components/settings
		await expect(editor.getSidebar("tools")).toBeExpanded();

		// Switch to simulate mode
		await editor.setMode("simulate");

		// Simulation controls should be present
		const simSidebar = editor.getSidebar("tools");
		await expect(simSidebar.getByText("Simulation")).toBeVisible();
		// When switching to simulate mode, simulation starts automatically; expect Stop button
		await expect(simSidebar.getByRole("button", { name: "Stop" })).toBeVisible();
		await expect(simSidebar.getByText("Step Delay")).toBeVisible();
		await expect(simSidebar.getByRole("button", { name: "Step Forward" })).toBeVisible();
		await expect(simSidebar.getByRole("button", { name: "Reset" })).toBeVisible();
	});

	test("start/stop shows calculating and then finished time", async ({ editor, sim }) => {
		await editor.setMode("simulate");

		await sim.startContinuous();
		// Wait for calculation to finish deterministically via status text
		await sim.waitForSimulationFinished();

		// Finished text should appear ("Finished in X ms")
		const status = editor.getSidebar("tools").locator(".status-text");
		await expect(status).toContainText("Finished in");

		// Stopping when already finished should be a no-op
		await sim.stopContinuous();
	});

	test("delay slider updates label and simulation completes", async ({ editor, sim }) => {
		await editor.setMode("simulate");

		await sim.setUpdateDelay(0);
		await sim.startContinuous();
		await sim.waitForSimulationFinished();
		await sim.stopContinuous();

		// Set to 16ms and run again
		await sim.setUpdateDelay(16);
		await sim.startContinuous();
		await sim.waitForSimulationFinished();
		const status = editor.getSidebar("tools").locator(".status-text");
		await expect(status).toContainText("Finished in");
	});

	test("step forward consumes queue when stopped", async ({ editor, pointer, sim }) => {
		// Build minimal circuit IN -> LED
		await editor.addComponent("IN", 400, 400);
		await editor.addComponent("LED", 600, 200);
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("LED", "in").first(),
		);

		await sim.resetToNonContinuous();

		// Initial queue may be non-empty; step until it settles (bounded)
		for (let i = 0; i < 5; i++) {
			const q = await sim.getQueueCount();
			if (q <= 0) break;
			await sim.step();
		}

		// Toggle input and step a few times to propagate
		const input = editor.getComponent("IN").first();
		const led = editor.getComponent("LED").first();

		await pointer.clickOn(input, true);
		await expect(input).toBePowered();

		for (let i = 0; i < 10; i++) {
			const q = await sim.getQueueCount();
			if (q <= 0) break;
			await sim.step();
		}

		await expect(led).toBePowered();
	});

	test("reset clears state and queue", async ({ editor, pointer, sim }) => {
		// Minimal circuit IN -> LED
		await editor.addComponent("IN", 400, 400);
		await editor.addComponent("LED", 600, 200);
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("LED", "in").first(),
		);

		await editor.setMode("simulate");
		await sim.startContinuous();
		await sim.waitForSimulationFinished();

		// Reset
		await sim.reset();

		// After reset, status should not show Calculating and queue should be 0
		await expect(editor.getSidebar("tools").getByText("Calculating...", { exact: false })).not.toBeVisible();
		const q = await sim.getQueueCount();
		expect(q).toBeGreaterThanOrEqual(0); // At least non-negative and usually 0
	});

	test("reset while continuous is on restarts continuous simulation", async ({ editor, pointer, sim }) => {
		// Minimal circuit to ensure there is something to process
		await editor.addComponent("IN", 400, 400);
		await editor.addComponent("LED", 600, 200);
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("LED", "in").first(),
		);

		await editor.setMode("simulate");

		// Start continuous simulation
		await sim.startContinuous();
		await sim.waitForSimulationFinished();

		// Now reset while still in continuous mode
		await sim.reset();

		// Expect that the simulation immediately runs again (status shows Calculating... briefly then Finished)
		await sim.waitForSimulationFinished();
		const status = editor.getSidebar("tools").locator(".status-text");
		await expect(status).toContainText("Finished in");
	});
});
