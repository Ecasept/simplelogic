import { LONG_PRESS_MS } from "./global.svelte";
import type { XYPair } from "./types";

let callback: (() => void) | null = null;
let timeoutCancel: NodeJS.Timeout | null = null;
let pressPos: XYPair | null = null;

/** How many pixels a mouse needs to move for it to no longer count as a long press */
const MOVE_THRESHOLD = 5;


function hasMouse() {
	return matchMedia("(pointer:fine)").matches;
}

/** Start a timer for a long press event
 *
 * A long press event is triggered when the mouse is pressed
 * for a certain amount of time, and does not move much
 *
 * @param pos The position of the mouse when the long press started
 * @param cb The callback to call when the long press is triggered
 */
export function startLongPressTimer(pos: XYPair, cb: () => void) {
	if (hasMouse()) {
		return;
	}
	callback = cb;
	pressPos = pos;
	timeoutCancel = setTimeout(() => {
		if (callback) {
			callback();
		}
		cancelLongPress();
	}, LONG_PRESS_MS);
}

/** Cancel an ongoing long press if the mouse has moved too far from its original position */
export function cancelLongPressIfMoved(mousePos: XYPair) {
	if (timeoutCancel) {
		// If the mouse has moved more than 5 pixels, cancel the long press
		const posDiff =
			Math.abs(mousePos.x - pressPos!.x) + Math.abs(mousePos.y - pressPos!.y);
		if (posDiff > MOVE_THRESHOLD) {
			clearTimeout(timeoutCancel);
		}
	}
}

/** Cancel an ongoing long press regardless of mouse movement */
export function cancelLongPress() {
	if (timeoutCancel) {
		clearTimeout(timeoutCancel);
	}
}
