import { describe, expect, it } from "vitest";
import {
	CURVES,
	circularEaseIn,
	circularEaseInOut,
	circularEaseOut,
	cubicBezier,
} from "./curves.ts";
import genieFixture from "./fixtures/genie.json";
import glassFixture from "./fixtures/glass.json";
import springboardFixture from "./fixtures/springboard.json";
import swiftuiFixture from "./fixtures/swiftui.json";
import uikitFixture from "./fixtures/uikit.json";
import {
	APP_GENIE,
	type AppGeometry,
	appMesh,
	card,
	createAppTransition,
	genieAmount,
	genieSprings,
	genieTargets,
	meshPoint,
} from "./launch/transition.ts";
import {
	createMorph,
	MORPH,
	type MorphGeometry,
	startScale,
} from "./morph/glass.ts";
import {
	DECELERATION,
	decay,
	project,
	RUBBER_BAND,
	rubberBand,
} from "./physics.ts";
import { springboard, swiftui, uikit } from "./presets.ts";
import {
	bounce,
	fromBounce,
	fromPhysics,
	fromSettling,
	physics,
	type Spring,
	solve,
	spring,
	value,
	velocity,
} from "./spring.ts";
import { PUSH } from "./transitions/push.ts";
import { SHEET } from "./transitions/sheet.ts";
import { recededScale } from "./transitions/zoom.ts";

const rms = (errors: number[]) =>
	Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);

/** The best start time for a curve against samples, and the RMS error there. */
function align(
	times: number[],
	observed: number[],
	curve: (t: number) => number,
) {
	let best = { start: 0, rms: Number.POSITIVE_INFINITY };
	for (let start = -0.05; start <= 0.3; start += 0.0005) {
		const error = rms(times.map((t, i) => curve(t - start) - observed[i]));
		if (error < best.rms) best = { start, rms: error };
	}
	return best;
}

const CONSTRUCTED: Record<string, Spring | undefined> = {
	default: spring(0.5),
	smooth: swiftui.smooth,
	snappy: swiftui.snappy,
	bouncy: swiftui.bouncy,
	"smooth(duration:0.3)": spring(0.3),
	"snappy(duration:0.4,extraBounce:0.1)": fromBounce(0.4, 0.15 + 0.1),
	"bouncy(duration:0.6,extraBounce:0.2)": fromBounce(0.6, 0.3 + 0.2),
	"duration:0.5,bounce:-0.3": fromBounce(0.5, -0.3),
	"response:0.55,dampingRatio:0.825": spring(0.55, 0.825),
	"mass:1,stiffness:100,damping:10": fromPhysics(1, 100, 10),
	"mass:3,stiffness:1000,damping:500": fromPhysics(3, 1000, 500),
};

describe("SwiftUI springs", () => {
	for (const sample of swiftuiFixture.springs) {
		const s = spring(sample.response, sample.dampingRatio);

		it(`${sample.name} matches Spring.value and Spring.velocity`, () => {
			// SwiftUI's overdamped velocity comes back with the target added after
			// the first instant. Its positions are right.
			const quirk = sample.dampingRatio > 1 ? 1 : 0;
			sample.value.forEach((expected, i) => {
				const t = i * sample.dt;
				expect(value(s, t)).toBeCloseTo(expected, 10);
				expect(velocity(s, t) + (t > 0 ? quirk : 0)).toBeCloseTo(
					sample.velocity[i],
					8,
				);
				expect(value(s, t, 4)).toBeCloseTo(sample.valueWithVelocity4[i], 10);
			});
		});

		const constructed = CONSTRUCTED[sample.name];
		if (constructed) {
			it(`${sample.name} converts the same way`, () => {
				expect(constructed.response).toBeCloseTo(sample.response, 12);
				expect(constructed.dampingRatio).toBeCloseTo(sample.dampingRatio, 12);
				expect(bounce(constructed)).toBeCloseTo(sample.bounce, 12);
			});
		}

		if (sample.dampingRatio <= 1) {
			it(`${sample.name} has the same mass, stiffness and damping`, () => {
				const p = physics(s, sample.mass);
				expect(p.stiffness).toBeCloseTo(sample.stiffness, 8);
				expect(p.damping).toBeCloseTo(sample.damping, 8);
			});
		}
	}
});

describe("curves", () => {
	it("match CAMediaTimingFunction's control points", () => {
		for (const { name, controlPoints } of swiftuiFixture.curves) {
			const key = name === "easeInEaseOut" ? "easeInEaseOut" : name;
			const ours = CURVES[key as keyof typeof CURVES];
			for (const [i, v] of ours.entries()) {
				expect(v).toBeCloseTo(controlPoints[i], 7);
			}
		}
	});

	it("match SwiftUI's UnitCurve, which solves in 32-bit floats", () => {
		const ours: Record<string, (t: number) => number> = {
			easeIn: cubicBezier(CURVES.easeIn),
			easeOut: cubicBezier(CURVES.easeOut),
			easeInOut: cubicBezier(CURVES.easeInEaseOut),
			circularEaseIn,
			circularEaseOut,
			circularEaseInOut,
		};
		for (const { name, value: values } of swiftuiFixture.unitCurves) {
			values.forEach((expected, i) => {
				expect(ours[name](i * 0.05)).toBeCloseTo(expected, 5);
			});
		}
	});
});

describe("UIKit", () => {
	const animations = uikitFixture.probe.animations;
	const call = (name: string) => {
		const found = animations.find((a) => a.call === name);
		if (!found) throw new Error(`No ${name} in the fixture`);
		return found;
	};
	// UIKit's Newton search stops within about 1e-8 of the root.
	const expectPhysics = (s: Spring, name: string) => {
		const observed = call(name);
		const p = physics(s, observed.mass ?? 1);
		expect(p.stiffness).toBeCloseTo(observed.stiffness ?? 0, 4);
		expect(p.damping).toBeCloseTo(observed.damping ?? 0, 4);
	};

	it("solves usingSpringWithDamping like UIKit", () => {
		expectPhysics(fromSettling(0.5, 0.8), "usingSpringWithDamping 0.5 0.8");
		expectPhysics(
			fromSettling(0.5, 1),
			"UISpringTimingParameters dampingRatio 1",
		);
	});

	it("converts springDuration and bounce like UIKit", () => {
		expectPhysics(fromBounce(0.5, 0), "springDuration 0.5 bounce 0");
		expectPhysics(fromBounce(0.5, 0.3), "springDuration 0.5 bounce 0.3");
	});

	it("runs UISpringTimingParameters() critically damped", () => {
		const observed = call("UISpringTimingParameters init");
		expect([observed.mass, observed.stiffness, observed.damping]).toEqual([
			3, 1000, 500,
		]);
		expect(uikit.timing.dampingRatio).toBe(1);
		expect(uikit.timing.response).toBeCloseTo(0.3441442325727286, 12);
	});

	it("animates with the ease-in-out curve by default", () => {
		expect(call("animateWithDuration").timing).toBe(
			"cubic-bezier(0.419999987, 0, 0.579999983, 1)",
		);
	});

	it("rubber bands like UIScrollView", () => {
		expect(uikitFixture.probe.rubberBandCoefficient).toBe(RUBBER_BAND);
		for (const [range, offset, result] of uikitFixture.probe.rubberBand) {
			expect(rubberBand(Number(offset), Number(range))).toBeCloseTo(
				Number(result),
				9,
			);
		}
	});

	it("decelerates at UIScrollView's rates", () => {
		expect(uikitFixture.probe.decelerationRateNormal).toBe(DECELERATION.normal);
		expect(uikitFixture.probe.decelerationRateFast).toBe(DECELERATION.fast);
		expect(project(1000)).toBeCloseTo(499, 9);
		expect(decay(1000, 100)).toBeCloseTo(project(1000), 9);
	});
});

describe("SpringBoard", () => {
	const { open, close, screen, icon, iconCornerRadius, displayCornerRadius } =
		springboardFixture;
	const start = icon[2] / screen[0];
	const geometry = {
		icon: { x: icon[0], y: icon[1], width: icon[2], height: icon[3] },
		screen: { x: 0, y: 0, width: screen[0], height: screen[1] },
		iconRadius: iconCornerRadius,
		screenRadius: displayCornerRadius,
	};
	const progress = (scales: number[]) =>
		scales.map((s) => (s - start) / (1 - start));

	it("opens the card on genieFullScreenCenterRowZoomUpSettings", () => {
		const result = align(open.t, progress(open.scale), (t) =>
			value(springboard.open, t),
		);
		expect(result.rms).toBeLessThan(0.002);
	});

	it("closes the card on iconZoomDownSettings", () => {
		const result = align(
			close.t,
			progress(close.scale),
			(t) => 1 - value(springboard.close, t),
		);
		expect(result.rms).toBeLessThan(0.002);
	});

	it("scales the home screen on homeScreenScaleSettings when closing", () => {
		const from = springboard.home.scale;
		const result = align(
			close.t,
			close.homeScale,
			(t) => from + (1 - from) * value(springboard.home.spring, t),
		);
		expect(result.rms).toBeLessThan(0.002);
	});

	it("crops and moves the card the way SpringBoard does", () => {
		const { start: t0 } = align(open.t, progress(open.scale), (t) =>
			value(springboard.open, t),
		);
		const heights: number[] = [];
		const centers: number[] = [];
		open.t.forEach((t, i) => {
			const frame = card(geometry, value(springboard.open, t - t0));
			heights.push(frame.layerHeight - open.height[i]);
			centers.push(frame.y + frame.height / 2 - open.centerY[i]);
		});
		expect(rms(heights)).toBeLessThan(2);
		expect(rms(centers)).toBeLessThan(2);
	});

	it("springs the corner radius and resets it on SpringBoard's timer", () => {
		const { start: t0 } = align(open.t, progress(open.scale), (t) =>
			value(springboard.open, t),
		);
		const transition = createAppTransition(() => geometry);
		transition.show(t0);
		const errors = open.t.map((t, i) => {
			const frame = transition.sample(t);
			return frame.radius / frame.scale - open.cornerRadius[i];
		});
		expect(rms(errors)).toBeLessThan(1);
	});
});

describe("SpringBoard's genie mesh", () => {
	const [width, height] = genieFixture.screen;
	const screen = { x: 0, y: 0, width, height };
	const geometryOf = ([x, y, w, h]: number[]): AppGeometry => ({
		icon: { x, y, width: w, height: h },
		screen,
		iconRadius: 16.64,
		screenRadius: 62,
	});

	/** When the layout spring reaches `target`, from 0. */
	const timeAt = (s: Spring, target: number) => {
		let lo = 0;
		let hi = 3;
		for (let i = 0; i < 60; i++) {
			const mid = (lo + hi) / 2;
			if (value(s, mid) < target) lo = mid;
			else hi = mid;
		}
		return (lo + hi) / 2;
	};

	it("gives each row the response SpringBoard asked for", () => {
		expect(genieAmount(geometryOf(genieFixture.runs[0].icon))).toBeCloseTo(
			0.84287,
			4,
		);
		expect(genieAmount(geometryOf(genieFixture.runs[4].icon))).toBeCloseTo(
			-0.19622,
			4,
		);
		for (const run of genieFixture.runs) {
			const springs = genieSprings(geometryOf(run.icon), run.open);
			run.responses.forEach((response, row) => {
				expect(springs[row].response).toBeCloseTo(response, 5);
				expect(springs[row].dampingRatio).toBe(1);
			});
		}
	});

	for (const run of genieFixture.runs) {
		const name = `${run.open ? "opens" : "closes"} ${run.app} through the same mesh`;
		it(name, () => {
			const geometry = geometryOf(run.icon);
			const layout = run.open ? springboard.open : springboard.close;
			const springs = genieSprings(geometry, run.open);
			const from = genieTargets(geometry, !run.open);
			const to = genieTargets(geometry, run.open);
			const errors: number[] = [];
			for (const sample of run.samples) {
				const t = timeAt(
					layout,
					run.open ? sample.progress : 1 - sample.progress,
				);
				const values = from.map((x, i) => {
					const row = Math.floor(i / 2 / (APP_GENIE.segments + 1));
					return solve(springs[row], t, x, to[i]).position;
				});
				const mesh = appMesh(geometry, sample.progress, values);
				mesh.forEach((vertex, i) => {
					errors.push(vertex.x - sample.vertices[i][0]);
					errors.push(vertex.y - sample.vertices[i][1]);
				});
			}
			expect(rms(errors)).toBeLessThan(0.05);
			expect(Math.max(...errors.map(Math.abs))).toBeLessThan(0.3);
		});
	}

	it("fills between vertices the way Core Animation does", () => {
		const { pull, edge } = genieFixture.meshTest;
		const mesh = Array.from({ length: 9 }, (_, v) => {
			const row = Math.floor(v / 3) / 2;
			const column = (v % 3) / 2;
			return { x: v === 3 ? pull : column, y: row, u: 0, v: 0 };
		});
		for (const [t, x] of edge) {
			expect(meshPoint(mesh, 0, t).x).toBeCloseTo(x, 2);
		}
	});
});

describe("UIKit transitions", () => {
	const { push, sheet, zoom } = uikitFixture.transitions;
	const width = 402;
	const height = 874;

	it("pushes on the fluid spring with its retarget impulse", () => {
		const p = push.incoming.map((x) => 1 - x / width);
		expect(
			align(push.t, p, (t) => value(PUSH.spring, t, PUSH.velocity)).rms,
		).toBeLessThan(0.001);
	});

	it("presents a sheet on m 3, k 1000, c 500", () => {
		const p = sheet.incoming.map((y) => (height - y) / (height - SHEET.top));
		expect(align(sheet.t, p, (t) => value(SHEET.spring, t)).rms).toBeLessThan(
			0.002,
		);
	});

	it("recedes the zoom's background by 34.67 points", () => {
		const sizes = zoom.source.filter((s): s is number => s !== null);
		expect(sizes[sizes.length - 1] / 120).toBeCloseTo(recededScale(width), 3);
	});
});

describe("iOS 27's liquid morph", () => {
	const rect = ([x, y, width, height]: number[]) => ({ x, y, width, height });
	const geometry: MorphGeometry = {
		source: rect(glassFixture.button),
		target: rect(glassFixture.popover),
		pivot: rect(glassFixture.label),
		sourceRadius: glassFixture.buttonRadius,
		targetRadius: glassFixture.popoverRadius,
	};
	const [opening, closing] = glassFixture.after;

	// Plays the port from `start` and reads the same values the hook did.
	const replay = (open: boolean, start: number) => {
		const morph = createMorph(() => geometry);
		morph.jump(!open, 0);
		if (open) morph.show(start);
		else morph.hide(start);
		return (t: number) => morph.sample(t);
	};
	const errors = (
		run: typeof opening,
		start: number,
		read: (
			frame: ReturnType<ReturnType<typeof replay>>,
		) => Record<string, number>,
		observed: (row: (typeof opening.frames)[number]) => Record<string, number>,
	) => {
		const sample = replay(run.open, start);
		const out: Record<string, number[]> = {};
		for (const row of run.frames) {
			const ours = read(sample(row.t));
			const theirs = observed(row);
			for (const key of Object.keys(theirs)) {
				out[key] ??= [];
				out[key].push(ours[key] - theirs[key]);
			}
		}
		return Object.fromEntries(
			Object.entries(out).map(([key, list]) => [key, rms(list)]),
		);
	};
	const startOf = (run: typeof opening) =>
		align(
			run.frames.map((row) => row.t),
			run.frames.map((row) => {
				const s0 = startScale(geometry);
				return (row.scale - s0) / (1 - s0);
			}),
			(t) =>
				run.open ? value(MORPH.open.main, t) : 1 - value(MORPH.close.main, t),
		);

	it("opens on mainEjectSpring and closes on mainAbsorbSpring, at speed 0.7", () => {
		expect(startOf(opening).rms).toBeLessThan(0.001);
		expect(startOf(closing).rms).toBeLessThan(0.001);
	});

	for (const run of [opening, closing]) {
		const name = run.open ? "opening" : "closing";
		const { start } = startOf(run);

		it(`moves both shapes like iOS when ${name}`, () => {
			const result = errors(
				run,
				start,
				({ popover, source }) => ({
					x: popover.x,
					y: popover.y,
					width: popover.width * popover.scale,
					height: popover.height * popover.scale,
					sourceX: source.x,
					sourceY: source.y,
					sourceWidth: source.width * source.scale,
					sourceHeight: source.height * source.scale,
				}),
				(row) => ({
					x: row.popover[0],
					y: row.popover[1],
					width: row.popover[2],
					height: row.popover[3],
					...(row.source && {
						sourceX: row.source[0],
						sourceY: row.source[1],
						sourceWidth: row.source[2],
						sourceHeight: row.source[3],
					}),
				}),
			);
			for (const error of Object.values(result)) expect(error).toBeLessThan(1);
		});

		it(`crossfades the content and pulses the lens like iOS when ${name}`, () => {
			const result = errors(
				run,
				start,
				(frame) => ({
					opacity: frame.opacity,
					lens: frame.lens,
					lensBlur: frame.lensBlur,
					field: frame.field,
				}),
				(row) => ({
					opacity: Math.min(Math.max(row.opacity ?? 0, 0), 1),
					lens: row.lens ?? 0,
					lensBlur: row.lensBlur ?? 0,
					field: row.field ?? 0,
				}),
			);
			expect(result.opacity).toBeLessThan(0.002);
			expect(result.lens).toBeLessThan(0.5);
			expect(result.lensBlur).toBeLessThan(0.15);
			expect(result.field).toBeLessThan(0.6);
		});
	}
});
