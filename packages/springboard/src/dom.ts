import type { Rect } from "./geometry.ts";

/** An element, a ref to one, or a function that returns one when it's needed. */
export type ElementSource =
	| HTMLElement
	| null
	| undefined
	| { readonly current: HTMLElement | null }
	| (() => HTMLElement | null | undefined);

/**
 * `"user"` follows `prefers-reduced-motion`. `"always"` and `"never"` ignore
 * it. Reduced, an effect fades instead of moving.
 */
export type ReducedMotion = "user" | "always" | "never";

export function resolve(source: ElementSource): HTMLElement | null {
	if (!source) return null;
	if (typeof source === "function") return source() ?? null;
	if ("current" in source) return source.current;
	return source;
}

export function reduced(setting: ReducedMotion = "user") {
	if (setting === "user")
		return matchMedia("(prefers-reduced-motion: reduce)").matches;
	return setting === "always";
}

export const seconds = () => performance.now() / 1000;

/** Seconds that pass at `speed()`, which can change between reads. */
export function createClock(speed: () => number) {
	let real = seconds();
	let time = real;
	return () => {
		const at = seconds();
		time += (at - real) * speed();
		real = at;
		return time;
	};
}

export function relative(
	element: HTMLElement,
	bounds: HTMLElement | null,
): Rect {
	const box = element.getBoundingClientRect();
	if (!bounds)
		return { x: box.left, y: box.top, width: box.width, height: box.height };
	const outer = bounds.getBoundingClientRect();
	return {
		x: box.left - outer.left - bounds.clientLeft,
		y: box.top - outer.top - bounds.clientTop,
		width: box.width,
		height: box.height,
	};
}

// Faded rather than hidden, so the target can still be pressed to turn an
// effect round.
export function createHider() {
	let hidden: { element: HTMLElement; opacity: string } | null = null;
	const reveal = () => {
		if (!hidden) return;
		hidden.element.style.opacity = hidden.opacity;
		hidden = null;
	};
	return {
		hide(element: HTMLElement) {
			if (hidden?.element === element) return;
			reveal();
			hidden = { element, opacity: element.style.opacity };
			element.style.opacity = "0";
		},
		reveal,
	};
}

/** What every effect can do, whatever drives it. */
export type Effect = {
	readonly isOpen: boolean;
	/** Animates open. `instant` jumps straight there. */
	open(options?: { instant?: boolean }): void;
	/** Animates closed. `instant` jumps straight there. */
	close(options?: { instant?: boolean }): void;
	toggle(): void;
	/** Stops the effect and leaves the element and target as they were. */
	destroy(): void;
};
