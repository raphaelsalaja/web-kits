// Apple's presets as Motion transitions. Springs keep their physics, so
// Motion retargets them with velocity the way Core Animation does, and timed
// curves keep their control points.

import type { Curve } from "./curves.ts";
import { springboard as SB, swiftui as SUI, uikit as UI } from "./presets.ts";
import { type Spring, toMotion } from "./spring.ts";

export { toMotion };

export type MotionSpring = ReturnType<typeof toMotion>;
export type MotionTween = { duration: number; ease: number[]; delay?: number };

/** A timed curve as a Motion tween, in seconds. */
export function tween(duration: number, curve: Curve, delay = 0): MotionTween {
	return { duration, ease: [...curve], ...(delay ? { delay } : {}) };
}

const timed = (s: { duration: number; curve: Curve; delay?: number }) =>
	tween(s.duration, s.curve, s.delay);

const motion = (s: Spring) => toMotion(s);

export const swiftui = {
	smooth: motion(SUI.smooth),
	snappy: motion(SUI.snappy),
	bouncy: motion(SUI.bouncy),
	interactive: motion(SUI.interactive),
	easeInOut: timed(SUI.easeInOut),
};

export const uikit = {
	timing: motion(UI.timing),
	sheet: motion(UI.sheet),
	navigation: motion(UI.navigation.spring),
	navigationInteractive: motion(UI.navigation.interactive),
	zoom: motion(UI.zoom.spring),
	zoomCornerRadius: motion(UI.zoom.cornerRadius),
};

export const springboard = {
	open: motion(SB.open),
	close: motion(SB.close),
	windowed: motion(SB.windowed),
	home: motion(SB.home.spring),
	folder: motion(SB.folder.spring),
	folderZoom: motion(SB.folder.zoom),
	folderOpen: {
		crossfade: timed(SB.folder.open.crossfade),
		grid: timed(SB.folder.open.grid),
		inner: timed(SB.folder.open.inner),
		outer: timed(SB.folder.open.outer),
	},
	folderClose: {
		crossfade: motion(SB.folder.close.crossfade),
		grid: timed(SB.folder.close.grid),
		inner: timed(SB.folder.close.inner),
		outer: timed(SB.folder.close.outer),
	},
	reduceMotion: timed(SB.reduceMotion),
};
