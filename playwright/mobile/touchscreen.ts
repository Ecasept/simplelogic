import { JSHandle, Locator, Page } from "@playwright/test";
import { Pointer } from "../fixtures";

export class MobilePointer implements Pointer {
	/** The position of this pointer on the screen, or null if it isn't currently positioned on the screen */
	private currentPosition: { x: number; y: number } | null = null;
	private isDown = false;
	private cleanedUp = false;

	/** Returns a new pointer on `page` with the specified `pointerId` */
	static async new(page: Page, pointerId: number) {
		const currentElements = await page.evaluateHandle(() => []);
		const lastDownedElement = await page.evaluateHandle(() => null);
		return new MobilePointer(
			page,
			pointerId,
			currentElements,
			lastDownedElement,
		);
	}

	constructor(
		private readonly page: Page,
		private pointerId: number,
		/** The elements which are currently reachable under the pointer */
		private currentElements: JSHandle<Element[]>,
		/** The last element that this pointer last pressed down upon */
		private lastDownedElement: JSHandle<Element | null>,
	) {}

	/** Cleans up held JSHandles of the pointer */
	async cleanup() {
		if (this.cleanedUp) {
			throw new Error("Pointer already cleaned up");
		}
		await this.currentElements.dispose();
		await this.lastDownedElement.dispose();
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
		const getElements = ({
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
		const newElements = await this.page.evaluateHandle(getElements, {
			oldElements: this.currentElements,
			pointerId: this.pointerId,
			position: this.currentPosition,
			isDown: this.isDown,
		});
		// Dispose of the old element handle and set the variable to the new one
		await this.currentElements.dispose();
		this.currentElements = newElements;
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
					throw new Error("Can't dispatch event - No element at position");
				}
				element.dispatchEvent(new PointerEvent(event, init));
			},
			{ event, init },
		);
	}

	/** Return the element that is currently under the pointer */
	private async getCurrentElement() {
		if (this.currentPosition === null) {
			throw new Error("No current position to down at");
		}
		return await this.page.evaluateHandle(({ x, y }) => {
			const el = document.elementFromPoint(x, y);
			if (el === null) {
				throw new Error(
					`Can't get current element - No element at position ${x}, ${y}`,
				);
			}
			return el;
		}, this.currentPosition);
	}

	/** Dispatch a synthetic click event
	 * if the pointer is under the same element as when it was pressed down.
	 *
	 * cf. https://developer.mozilla.org/en-US/docs/Web/API/Element/click_event
	 * > A pointing-device button (such as a mouse's primary button) is both pressed and released while the pointer is located inside the element.
	 */
	private async maybeDispatchClick(currentElement: JSHandle<Element>) {
		if (this.currentPosition === null) {
			throw new Error("No current position to click at");
		}
		const init: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		await this.page.evaluate(
			// @ts-ignore - PointerEventInit can contain itself
			({ init, last, current }) => {
				console.log("test");
				console.log(last, current);
				if (last === current) {
					current.dispatchEvent(new PointerEvent("click", init));
				}
			},
			{
				init: init,
				last: this.lastDownedElement,
				current: currentElement,
			},
		);
	}

	/** Dispatch a pointerdown event at the current coordinates.
	 *
	 * Will issue pointerenter and pointerleave events first.
	 */
	async down() {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		if (this.isDown) {
			throw new Error("Pointer is already down");
		}
		if (this.currentPosition === null) {
			throw new Error("No current position to down at");
		}

		this.isDown = true;
		await this.lastDownedElement?.dispose();
		this.lastDownedElement = await this.getCurrentElement();
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
	 *
	 * Will also dispatch a click event if the pointer is over the same element as when it was pressed down.
	 */
	async up() {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		if (!this.isDown) {
			throw new Error("Pointer is not down");
		}
		if (this.currentPosition === null) {
			throw new Error("No current position to up at");
		}
		this.isDown = false;
		const event: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		const el = await this.getCurrentElement();
		await this.dispatchEvent("pointerup", event);
		await this.recalculateElements();
		await this.maybeDispatchClick(el);
		await el.dispose();
	}

	/** Dispatch a pointermove event at the specified coordinates
	 *
	 * Will issue pointerenter and pointerleave events first for elements that are now under the pointer.
	 */
	async moveTo(x: number, y: number) {
		if (this.cleanedUp) {
			throw new Error("Pointer used after being cleaned up");
		}
		this.currentPosition = { x, y };

		if (!this.isDown) {
			// If the pointer is not down, we don't need to issue a pointermove event.
			// The move method can be used in conjunction with the down method
			// to move the pointer to a new position before pressing down
			// without issuing a pointermove event, like downAt does.
			return;
		}

		await this.recalculateElements();

		const event: PointerEventInit = {
			clientX: this.currentPosition.x,
			clientY: this.currentPosition.y,
			pointerId: this.pointerId,
			bubbles: true,
		};
		await this.dispatchEvent("pointermove", event);
	}

	/** Move the pointer to the specified coordinates
	 * without issuing a pointermove event,
	 * and dispatch a pointerdown event there.
	 */
	async downAt(x: number, y: number) {
		await this.moveTo(x, y);
		await this.down();
	}

	/** Simulate a tap at the specified coordinates by dispatching a pointerdown and pointerup event */
	async clickAt(x: number, y: number) {
		await this.downAt(x, y);
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
		const pos = await this.getPos(locator);
		await this.downAt(pos.x, pos.y);
	}
	/** Simulate a pointermove event to the position of `locator` */
	async moveOnto(locator: Locator) {
		const pos = await this.getPos(locator);
		await this.moveTo(pos.x, pos.y);
	}
	/** Simulate a tap at the position of `locator` */
	async clickOn(locator: Locator) {
		const pos = await this.getPos(locator);
		await this.clickAt(pos.x, pos.y);
	}
}

/** A touchscreen that can manage multiple pointers */
export class Touchscreen {
	private pointerId = 0;
	private pointers: MobilePointer[] = [];
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
		const pointer = await MobilePointer.new(this.page, this.pointerId);
		this.pointerId++;
		this.pointers.push(pointer);
		return pointer;
	}

	/** Delete a pointer from the page so that it cannot be used anymore and does not receive
	 * any more events from the page.
	 */
	async deletePointer(pointer: MobilePointer) {
		const index = this.pointers.indexOf(pointer);
		if (index === -1) {
			throw new Error("Pointer not found");
		}
		this.pointers.splice(index, 1);
		await pointer.cleanup();
	}
}
