"use client";

import {
	useCallback,
	useInsertionEffect,
	useLayoutEffect,
	useRef,
} from "react";
import { followBaseUI } from "./follow.ts";
import { type Origin, type OriginOptions, origin } from "./origin.ts";

/**
 * Opens the element you put the returned ref on out of `from`, and closes it
 * back in. On a Base UI popup it follows the popup's own open state. Anywhere
 * else, pass `open`. Options can change on any render.
 */
export function useOrigin(options: OriginOptions) {
	const latest = useRef(options);
	const applied = useRef(options);
	const instance = useRef<Origin | null>(null);
	const controlled = useRef(false);

	// A popup's ref attaches before its parent's layout effects run, so a popup
	// mounting in this render needs this render's options already.
	useInsertionEffect(() => {
		latest.current = options;
	});

	useLayoutEffect(() => {
		const previous = applied.current;
		applied.current = options;
		const effect = instance.current;
		if (!effect) return;
		// An option left out now goes back to its default.
		const cleared = Object.fromEntries(
			Object.keys(previous)
				.filter((key) => !(key in options))
				.map((key) => [key, undefined]),
		);
		const { open, ...rest } = options;
		effect.set({ ...cleared, ...rest });
		if (!controlled.current || open === undefined || open === effect.isOpen)
			return;
		if (open) effect.open();
		else effect.close();
	});

	return useCallback((element: HTMLElement | null) => {
		instance.current?.destroy();
		instance.current = null;
		if (!element) return () => {};
		const options = latest.current;
		const effect = origin(element, options);
		applied.current = options;
		controlled.current = options.open !== undefined;
		const unfollow = controlled.current
			? undefined
			: followBaseUI(element, effect);
		instance.current = effect;
		return () => {
			unfollow?.();
			effect.destroy();
			if (instance.current === effect) instance.current = null;
		};
	}, []);
}
