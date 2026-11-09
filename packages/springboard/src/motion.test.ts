import { describe, expect, it } from "vitest";
import * as transitions from "./motion.ts";
import { springboard, swiftui, uikit } from "./presets.ts";
import type { Spring } from "./spring.ts";

const springs: Record<string, [Spring, unknown]> = {
	"swiftui.smooth": [swiftui.smooth, transitions.swiftui.smooth],
	"swiftui.snappy": [swiftui.snappy, transitions.swiftui.snappy],
	"swiftui.bouncy": [swiftui.bouncy, transitions.swiftui.bouncy],
	"swiftui.interactive": [swiftui.interactive, transitions.swiftui.interactive],
	"uikit.timing": [uikit.timing, transitions.uikit.timing],
	"uikit.sheet": [uikit.sheet, transitions.uikit.sheet],
	"uikit.navigation": [uikit.navigation.spring, transitions.uikit.navigation],
	"uikit.navigationInteractive": [
		uikit.navigation.interactive,
		transitions.uikit.navigationInteractive,
	],
	"uikit.zoom": [uikit.zoom.spring, transitions.uikit.zoom],
	"uikit.zoomCornerRadius": [
		uikit.zoom.cornerRadius,
		transitions.uikit.zoomCornerRadius,
	],
	"springboard.open": [springboard.open, transitions.springboard.open],
	"springboard.close": [springboard.close, transitions.springboard.close],
	"springboard.windowed": [
		springboard.windowed,
		transitions.springboard.windowed,
	],
	"springboard.home": [springboard.home.spring, transitions.springboard.home],
	"springboard.folder": [
		springboard.folder.spring,
		transitions.springboard.folder,
	],
	"springboard.folderZoom": [
		springboard.folder.zoom,
		transitions.springboard.folderZoom,
	],
	"springboard.folderClose.crossfade": [
		springboard.folder.close.crossfade,
		transitions.springboard.folderClose.crossfade,
	],
};

const tweens = {
	"swiftui.easeInOut": [swiftui.easeInOut, transitions.swiftui.easeInOut],
	"springboard.folderOpen.crossfade": [
		springboard.folder.open.crossfade,
		transitions.springboard.folderOpen.crossfade,
	],
	"springboard.folderOpen.grid": [
		springboard.folder.open.grid,
		transitions.springboard.folderOpen.grid,
	],
	"springboard.folderOpen.inner": [
		springboard.folder.open.inner,
		transitions.springboard.folderOpen.inner,
	],
	"springboard.folderOpen.outer": [
		springboard.folder.open.outer,
		transitions.springboard.folderOpen.outer,
	],
	"springboard.folderClose.grid": [
		springboard.folder.close.grid,
		transitions.springboard.folderClose.grid,
	],
	"springboard.folderClose.inner": [
		springboard.folder.close.inner,
		transitions.springboard.folderClose.inner,
	],
	"springboard.folderClose.outer": [
		springboard.folder.close.outer,
		transitions.springboard.folderClose.outer,
	],
	"springboard.reduceMotion": [
		springboard.reduceMotion,
		transitions.springboard.reduceMotion,
	],
} as const;

describe("Motion springs", () => {
	for (const [name, [source, motion]] of Object.entries(springs)) {
		it(name, () => {
			const { type, mass, stiffness, damping } = motion as {
				type: string;
				mass: number;
				stiffness: number;
				damping: number;
			};
			expect(type).toBe("spring");
			const response = 2 * Math.PI * Math.sqrt(mass / stiffness);
			const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
			expect(response).toBeCloseTo(source.response, 9);
			expect(dampingRatio).toBeCloseTo(source.dampingRatio, 9);
		});
	}
});

describe("Motion tweens", () => {
	for (const [name, [source, motion]] of Object.entries(tweens)) {
		it(name, () => {
			expect(motion.duration).toBe(source.duration);
			expect(motion.ease).toEqual([...source.curve]);
			const delay = "delay" in source ? source.delay : 0;
			expect("delay" in motion ? motion.delay : 0).toBe(delay);
		});
	}
});

it("speeds a spring up", () => {
	const fast = transitions.toMotion(springboard.open, 2);
	const response = 2 * Math.PI * Math.sqrt(fast.mass / fast.stiffness);
	expect(response).toBeCloseTo(springboard.open.response / 2, 9);
});
