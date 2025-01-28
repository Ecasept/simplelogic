import { JSHandle, Locator, Page } from "@playwright/test";

export class Pointer {
	/** The position of this pointer on the screen, or null if it isn't currently positioned on the screen */
	private currentPosition: { x: number; y: number } | null = null;
	private isDown = false;
	private cleanedUp = false;

	/** Returns a new pointer on `page` with the specified `pointerId` */
	static async new(page: Page, pointerId: number) {
		const currentElements = await page.evaluateHandle(() => []);
		return new Pointer(page, pointerId, currentElements);
	}

	constructor(
		private readonly page: Page,
		private pointerId: number,
		private currentElements: JSHandle<Element[]>,
	) {}

	async cleanup() {
		if (this.cleanedUp) {
			throw new Error("Pointer already cleaned up");
		}
		this.currentElements.dispose();
		this.cleanedUp = true;
	}

	/**
	 * Looks at which elements are visible at the current position (`this.currentPosition`),
	 * and compares that with the previously visible elements (`this.currentElements`).
	 * - If an element is visible now but wasn't before, a `pointerenter` event is dispatched for that element.
	 * - If an element was visible before but isn't now, a `pointerleave` event is dispatched for that element.
	 *
	 * Finally, the list of visible elements (`this.currentElements`) is updated to the current list.
	 */
	async recalculateElements() {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		const process = ({
			oldElements,
			pointerId,
			position,
			isDown,
		}: {
			oldElements: Element[];
			pointerId: number;
			position: { x: number; y: number };
			isDown: boolean;
		}) => {
			// Find all DOM elements that overlap with the current mouse coordinates
			const currentElements = isDown
				? document.elementsFromPoint(position.x, position.y)
				: [];

			const newElements = currentElements.filter(
				(element) => !oldElements.includes(element),
			);
			const removedElements = oldElements.filter(
				(element) => !currentElements.includes(element),
			);

			for (const element of removedElements) {
				const event: PointerEventInit = {
					clientX: position.x,
					clientY: position.y,
					pointerId,
					bubbles: true,
				};
				element.dispatchEvent(new PointerEvent("pointerleave", event));
			}

			for (const element of newElements) {
				const event: PointerEventInit = {
					clientX: position.x,
					clientY: position.y,
					pointerId,
					bubbles: true,
				};
				element.dispatchEvent(new PointerEvent("pointerenter", event));
			}

			return currentElements;
		};

		if (this.currentPosition === null) {
			throw new Error("Cannot recalculate elements without a position");
		}

		// Execute the process function in the page context and update the list of current elements
		this.currentElements = await this.page.evaluateHandle(process, {
			oldElements: this.currentElements,
			pointerId: this.pointerId,
			position: this.currentPosition,
			isDown: this.isDown,
		});
	}

	/** Dispatch a synthetic event on `this.page`.
	 * The target of the event is the object located at the client coordinates specified in `init`
	 * @param event The type of event to dispatch (eg. "pointerdown")
	 * @param init The init object for the event
	 */
	private async dispatchEvent(event: string, init: PointerEventInit) {
		await this.page.evaluate(
			// @ts-ignore - PointerEventInit can contain itself
			({ event, init }) => {
				if (init.clientX === undefined || init.clientY === undefined) {
					throw new Error("clientX and clientY must be specified");
				}
				const element = document.elementFromPoint(init.clientX, init.clientY);
				if (element === null) {
					throw new Error("No element at position");
				}
				element.dispatchEvent(new PointerEvent(event, init));
			},
			{ event, init },
		);
	}

	/** Dispatch a pointerdown event at the specified coordinates.
	 *
	 * Will issue pointerenter and pointerleave events first.
	 */
	async down(x: number, y: number) {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		this.currentPosition = { x, y };
		this.isDown = true;
		await this.recalculateElements();

		const event: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		await this.dispatchEvent("pointerdown", event);
	}

	/** Dispatch a pointerup event at the current coordinates
	 * (a pointerdown event must have been dispatched before)
	 *
	 * Will issue pointerenter and pointerleave events thereafter.
	 */
	async up() {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		if (this.currentPosition === null) {
			throw new Error("Pointer is not down");
		}
		this.isDown = false;
		const event: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		await this.dispatchEvent("pointerup", event);
		await this.recalculateElements();
		this.currentPosition = null;
	}

	/** Dispatch a pointermove event at the specified coordinates
	 *
	 * Will issue pointerenter and pointerleave events first for elements that are now under the pointer.
	 */
	async move(x: number, y: number) {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		this.currentPosition = { x, y };

		await this.recalculateElements();

		const event: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		await this.dispatchEvent("pointermove", event);
	}

	/** Simulate a tap at the specified coordinates by dispatching a pointerdown and pointerup event */
	async tap(x: number, y: number) {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		await this.down(x, y);
		await this.up();
	}
	/** Return the position of `locator` on the page */
	private async getPos(locator: Locator) {
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
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		const pos = await this.getPos(locator);
		await this.down(pos.x, pos.y);
	}
	/** Simulate a pointermove event to the position of `locator` */
	async moveTo(locator: Locator) {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		const pos = await this.getPos(locator);
		await this.move(pos.x, pos.y);
	}
	/** Simulate a tap at the position of `locator` */
	async tapOn(locator: Locator) {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		const pos = await this.getPos(locator);
		await this.tap(pos.x, pos.y);
	}
}

/** A touchscreen that can manage multiple pointers */
export class Touchscreen {
	private pointerId = 0;
	private pointers: Pointer[] = [];
	constructor(public readonly page: Page) {}

	/** Registers a mutation observer on the page which calls the
	 * `recalculateElements` method whenever the DOM changes.
	 * This is so that pointerenter and pointerleave events can be dispatched
	 * when elements are added or removed from the page, when they move
	 * under the pointer, etc.
	 *
	 * **Must be called in the page context.**
	 */
	private registerMutationObserver() {
		const observer = new MutationObserver(
			(window as any).playwrightRecalculateElements,
		);

		// Observe the entire document for changes
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	/** Recalculate all elements for all currently active pointers */
	private async recalculateElements() {
		for (const pointer of this.pointers) {
			await pointer.recalculateElements();
		}
	}

	async init() {
		// Allow the page to call `recalculateElements` when a mutation occurs
		await this.page.exposeFunction(
			"playwrightRecalculateElements",
			this.recalculateElements,
		);
		// Register observer on page load
		await this.page.addInitScript(this.registerMutationObserver);
	}

	/** Create a new pointer on the page */
	async createPointer() {
		const pointer = await Pointer.new(this.page, this.pointerId);
		this.pointerId++;
		this.pointers.push(pointer);
		return pointer;
	}

	/** Delete a pointer from the page so that it cannot be used anymore and does not receive
	 * any more events from the page.
	 */
	async deletePointer(pointer: Pointer) {
		const index = this.pointers.indexOf(pointer);
		if (index === -1) {
			throw new Error("Pointer not found");
		}
		this.pointers.splice(index, 1);
		await pointer.cleanup();
	}
}
