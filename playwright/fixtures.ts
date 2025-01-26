import { Locator, Page } from "@playwright/test";

export class Editor {
	constructor(
		private readonly page: Page,
		private readonly isMobile: boolean,
		private readonly touchscreen?: Touchscreen,
	) {
		if (isMobile && touchscreen === undefined) {
			throw new Error("Touchscreen must be provided for mobile tests");
		}
	}

	/**
	 * Returns a locator for all handles with a specific identifier
	 * that belong to a component with the specified type
	 * @param type The type of the component (eg. "AND")
	 * @param id The identifier of the handle (eg. "out" or "in1")
	 */
	getHandle(type: string, id: string) {
		// relay over to selector engine
		return this.page.locator(`handle=${type}:${id}`);
	}

	/** Returns a locator for all components with the specified type */
	getComponent(type: string) {
		return this.page.locator(`component=${type}`);
	}

	/** Adds a component with the specified type at the specified location */
	async addComponent(type: string, x: number, y: number) {
		if (this.isMobile) {
			const pointer = this.touchscreen!.createPointer();
			await this.page
				.locator(".sidebarWrapper")
				.getByText(type, { exact: true })
				.click();
			await pointer.tap(x, y);
		} else {
			throw new Error("Not implemented");
		}
	}

	/** Returns a locator matching all components currently in the editor */
	comp() {
		return this.page.locator(".component-body");
	}

	/* Connects two handles with each other */
	async connect(handle1: Locator, handle2: Locator) {
		if (this.isMobile) {
			const pointer = this.touchscreen!.createPointer();
			await pointer.downOn(handle1);
			await pointer.moveTo(handle2);
			await pointer.up();
		} else {
			throw new Error("Not implemented");
		}
	}

	/** Drags a locator to a specific position */
	async drag(locator: Locator, x: number, y: number) {
		if (this.isMobile) {
			const pointer = this.touchscreen!.createPointer();
			await pointer.downOn(locator);
			await pointer.move(x, y);
			await pointer.up();
		} else {
			throw new Error("Not implemented");
		}
	}

	async toggleSimulate() {
		await this.page.getByRole("button", { name: "Toggle Simulation" }).click();
	}
}

export class Pointer {
	currentPosition: { x: number; y: number } | null = { x: 0, y: 0 };

	constructor(
		public readonly page: Page,
		private pointerId: number,
	) {}

	/** Dispatch a synthetic event on `this.page`.
	 * The target of the event is the object located at the client coordinates specified in `init`
	 * @param event The type of event to dispatch (eg. "pointerdown")
	 * @param init The init object for the event
	 */
	async dispatchEvent(event: string, init: PointerEventInit) {
		await this.page.evaluate(
			// @ts-ignore - PointerEventInit can contain itself
			({ e: event, i: init }) => {
				const element = document.elementFromPoint(
					init.clientX ?? 0,
					init.clientY ?? 0,
				);
				if (element === null) {
					throw new Error("No element at position");
				}
				element.dispatchEvent(new PointerEvent(event, init));
			},
			{ e: event, i: init },
		);
	}

	/** Dispatch a pointerdown event at the specified coordinates */
	async down(x: number, y: number) {
		const event: PointerEventInit = {
			clientX: x,
			clientY: y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		this.currentPosition = { x, y };
		await this.dispatchEvent("pointerdown", event);
	}

	/** Dispatch a pointerup event at the current coordinates
	 * (a pointerdown event must have been dispatched before)
	 */
	async up() {
		if (this.currentPosition === null) {
			throw new Error("Pointer is not down");
		}
		const event: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		this.currentPosition = null;
		await this.dispatchEvent("pointerup", event);
	}

	/** Dispatch a pointermove event at the specified coordinates */
	async move(x: number, y: number) {
		const event: PointerEventInit = {
			clientX: x,
			clientY: y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		this.currentPosition = { x, y };
		await this.dispatchEvent("pointermove", event);
	}

	/** Simulate a tap at the specified coordinates by dispatching a pointerdown and pointerup event */
	async tap(x: number, y: number) {
		await this.down(x, y);
		await this.up();
	}
	/** Return the position of `locator` on the page */
	async getPos(locator: Locator) {
		const handle = await locator.elementHandle();
		if (handle === null) {
			throw new Error("Element not found");
		}
		const boundingBox = await handle.boundingBox();
		if (boundingBox === null) {
			throw new Error("Element not visible");
		}
		return {
			x: boundingBox.x + boundingBox.width / 2,
			y: boundingBox.y + boundingBox.height / 2,
		};
	}
	/** Simulate a pointerdown event at the position of `locator` */
	async downOn(locator: Locator) {
		const pos = await this.getPos(locator);
		await this.down(pos.x, pos.y);
	}
	/** Simulate a pointermove event to the position of `locator` */
	async moveTo(locator: Locator) {
		const pos = await this.getPos(locator);
		await this.move(pos.x, pos.y);
	}
	/** Simulate a tap at the position of `locator` */
	async tapOn(locator: Locator) {
		const pos = await this.getPos(locator);
		await this.tap(pos.x, pos.y);
	}
}

export class Touchscreen {
	pointerId = 0;
	constructor(public readonly page: Page) {}

	createPointer() {
		const pointer = new Pointer(this.page, this.pointerId);
		this.pointerId++;
		return pointer;
	}
}
