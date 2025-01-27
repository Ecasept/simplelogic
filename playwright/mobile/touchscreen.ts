import { JSHandle, Locator, Page } from "@playwright/test";

export class Pointer {
	/** The position of this pointer on the screen, or null if it isn't currently positioned on the screen */
	currentPosition: { x: number; y: number } | null = null;
	isDown = false;

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

	/**
	 * Looks at which elements are visible at the current position (`this.currentPosition`),
	 * and compares that with the previously visible elements (`this.currentElements`).
	 * - If an element is visible now but wasn't before, a `pointerenter` event is dispatched for that element.
	 * - If an element was visible before but isn't now, a `pointerleave` event is dispatched for that element.
	 *
	 * Finally, the list of visible elements (`this.currentElements`) is updated to the current list.
	 */
	async recalculateElements() {
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
				};
				element.dispatchEvent(new PointerEvent("pointerleave", event));
			}

			for (const element of newElements) {
				const event: PointerEventInit = {
					clientX: position.x,
					clientY: position.y,
					pointerId,
				};
				element.dispatchEvent(new PointerEvent("pointerenter", event));
			}

			return currentElements;
		};

		if (this.currentPosition === null) {
			throw new Error("Cannot recalculate elements without a position");
		}

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
	async dispatchEvent(event: string, init: PointerEventInit) {
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

/** A touchscreen that can manage multiple pointers */
export class Touchscreen {
	pointerId = 0;
	constructor(public readonly page: Page) {}

	/** Create a new pointer on the page */
	async createPointer() {
		const pointer = await Pointer.new(this.page, this.pointerId);
		this.pointerId++;
		return pointer;
	}
}
