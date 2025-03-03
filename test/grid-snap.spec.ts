import { test, expect } from '@playwright/test';

test.describe("grid snap", () => {
	test("grid snap flow", async ({ editor, pointer }) => {
		// Add component at 600, 300
		await editor.addComponent('and', 600, 300);
		const component = editor.lastAddedComponent;
		const initialX = await component.getAttribute('x');
		
		// disable grid snap
		await editor.toggleGridSnap(false);
		
		// move 1 pixel
		await pointer.move(component);
		await pointer.down();
		await pointer.move({ x: '+1', y: 0 });
		await pointer.up();
		
		// ensure x attribute has changed
		const disabledSnapX = await component.getAttribute('x');
		expect(disabledSnapX).not.toBe(initialX);
		
		// enable grid snap
		await editor.toggleGridSnap(true);
		
		// move 1 pixel
		await pointer.move(component);
		await pointer.down();
		await pointer.move({ x: '+1', y: 0 });
		await pointer.up();
		
		// ensure x attribute has changed
		const firstSnapX = await component.getAttribute('x');
		expect(firstSnapX).not.toBe(disabledSnapX);
		
		// move 1 pixel again
		await pointer.move(component);
		await pointer.down();
		await pointer.move({ x: '+1', y: 0 });
		await pointer.up();
		
		// ensure x attribute didn't change
		const secondSnapX = await component.getAttribute('x');
		expect(secondSnapX).toBe(firstSnapX);
	});
});
