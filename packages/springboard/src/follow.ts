import type { Effect } from "./dom.ts";

const STARTING = "data-starting-style";
const ENDING = "data-ending-style";

// Some popups, like Select's, stay mounted once they've closed, so it's the
// open state that's followed rather than the popup mounting.
const shown = (popup: HTMLElement) =>
	popup.hasAttribute("data-open") && !popup.hasAttribute(ENDING);

/**
 * Opens and closes `effect` with a Base UI popup. Base UI keeps a closing
 * popup mounted until its animations finish, and every effect holds an
 * animation on the element until it lands, so the popup stays until then.
 */
export function followBaseUI(popup: HTMLElement, effect: Effect) {
	if (popup.hasAttribute(STARTING)) effect.open();
	else if (shown(popup)) effect.open({ instant: true });
	else effect.close({ instant: true });

	const observer = new MutationObserver(() => {
		const open = shown(popup);
		if (open === effect.isOpen) return;
		if (open) effect.open();
		else effect.close();
	});
	observer.observe(popup, {
		attributes: true,
		attributeFilter: ["data-open", ENDING],
	});
	return () => observer.disconnect();
}
