import {
	createOverlay,
	gridLines,
	type Overlay,
	type Point,
} from "../debug.ts";
import {
	createHider,
	type Effect,
	type ElementSource,
	type ReducedMotion,
	reduced,
	resolve,
} from "../dom.ts";
import { createGenie, type GenieLayer, HANDOFF, IN_FLIGHT } from "./genie.ts";
import { type Edge, GENIE_DURATION, type Mesh } from "./mesh.ts";

export type GenieControllerOptions = {
	/** The element the window minimises into, like a Dock tile. */
	target: ElementSource;
	/** The screen the funnel is clipped to. Defaults to the viewport. */
	bounds?: ElementSource;
	/**
	 * The side of the screen the Dock is on. `"auto"` picks the side the target
	 * is on, from the window's centre.
	 */
	edge?: Edge | "auto";
	/** CSS pixels per macOS point, so a small screen bends like a full one. */
	scale?: number;
	/** Seconds from open to minimised. */
	duration?: number;
	/** Fades the window out over the second half. The Dock doesn't. */
	fade?: boolean;
	/** Blurs the window over the second half. */
	blur?: boolean;
	/** Hides the target while the window's open. The Dock doesn't. */
	hideTarget?: boolean;
	reducedMotion?: ReducedMotion;
	/**
	 * Plays slower or faster, like the Simulator's Slow Animations. 0.1 is ten
	 * times slower. It changes a run that's already going.
	 */
	speed?: number;
	/** Draws the mesh: its quads in blue and its vertices in orange. */
	debug?: boolean;
	/** Starts open, with no animation. Minimised by default, and hidden. */
	open?: boolean;
	onStart?: (open: boolean) => void;
	/** Called every frame with how far minimised the window is, 0 to 1. */
	onFrame?: (progress: number) => void;
	onLand?: (open: boolean) => void;
};

export type GenieController = Effect & {
	set(options: Partial<GenieControllerOptions>): void;
};

/**
 * Minimises `element` into `target` the way the Dock does and brings it back
 * out. A linear animation on the element is both the clock the mesh reads its
 * progress from and what hides the element while the copies are drawn, so
 * anything waiting on the element's animations, like Base UI's exit, waits
 * for the funnel.
 */
export function genieController(
	element: HTMLElement,
	initial: GenieControllerOptions,
): GenieController {
	let options = initial;
	// 1 is minimised.
	let progress = options.open ? 0 : 1;
	let goal = progress;
	let animation: Animation | null = null;
	let run: GenieLayer | null = null;
	let overlay: Overlay | null = null;
	let frame = 0;
	const target = createHider();
	const speed = () => options.speed ?? 1;
	const animate = (keyframes: Keyframe[], timing: KeyframeAnimationOptions) => {
		const current = element.animate(keyframes, timing);
		current.playbackRate = speed();
		return current;
	};

	const unlay = () => {
		overlay?.dispose();
		overlay = null;
	};

	const stop = () => {
		cancelAnimationFrame(frame);
		animation?.cancel();
		animation = null;
		run?.dispose();
		run = null;
		unlay();
	};

	const conceal = () => {
		animation = element.animate(handoff(1, 1), {
			duration: 0,
			fill: "forwards",
		});
	};

	const jump = (to: 0 | 1) => {
		stop();
		progress = to;
		goal = to;
		const tile = resolve(options.target);
		if (to === 0 && tile && options.hideTarget) target.hide(tile);
		else target.reveal();
		if (to === 1) conceal();
	};

	const play = (to: 0 | 1) => {
		const from = progress;
		goal = to;
		stop();
		const tile = resolve(options.target);
		if (to === 1) target.reveal();

		if (reduced(options.reducedMotion) || !tile) {
			const current = animate([{ opacity: 1 - from }, { opacity: 1 - to }], {
				duration: 200,
				easing: "ease",
				fill: to ? "forwards" : "none",
			});
			animation = current;
			progress = to;
			options.onStart?.(to === 0);
			current.finished.then(
				() => {
					if (animation !== current) return;
					if (to === 0 && tile && options.hideTarget) target.hide(tile);
					options.onLand?.(to === 0);
				},
				() => {},
			);
			return;
		}

		const length =
			Math.abs(to - from) * (options.duration ?? GENIE_DURATION) * 1000;
		if (length === 0) return;
		const bounds = resolve(options.bounds);
		run = createGenie({
			source: element,
			target: tile,
			bounds,
			edge: pickEdge(options.edge, element, tile),
			scale: options.scale,
			fade: options.fade,
			blur: options.blur,
		});
		const drawn = run;
		const clock = animate(handoff(from, to), {
			duration: length,
			easing: "linear",
			fill: to ? "forwards" : "none",
		});
		animation = clock;
		options.onStart?.(to === 0);
		let landed = false;

		const land = () => {
			if (animation !== clock || landed) return;
			landed = true;
			cancelAnimationFrame(frame);
			if (progress !== to) {
				progress = to;
				options.onFrame?.(progress);
			}
			if (to === 0) {
				stop();
				if (options.hideTarget) target.hide(tile);
			} else {
				// The clock stays, filled, so the element stays hidden.
				drawn.dispose();
				run = null;
				unlay();
			}
			options.onLand?.(to === 0);
		};
		// Base UI unmounts a closing popup as soon as the clock finishes, which
		// can be before the next frame.
		clock.finished.then(land, () => {});

		const tick = () => {
			if (animation !== clock || landed) return;
			const time = Number(clock.currentTime ?? 0);
			const t = Math.min(time / length, 1);
			progress = from + (to - from) * t;
			// A positioner can place the popup a frame after it mounts.
			drawn.place();
			const mesh = drawn.draw(t < 1 ? Math.max(progress, IN_FLIGHT) : progress);
			if (options.debug && mesh) {
				overlay ??= createOverlay(bounds);
				overlay.draw(...meshLines(mesh));
			} else if (options.debug) overlay?.clear();
			else unlay();
			options.onFrame?.(progress);
			if (clock.playState === "finished") {
				land();
				return;
			}
			frame = requestAnimationFrame(tick);
		};
		tick();
	};

	if (goal === 1) conceal();

	return {
		get isOpen() {
			return goal === 0;
		},
		open({ instant = false } = {}) {
			if (instant) jump(0);
			else if (goal !== 0) play(0);
		},
		close({ instant = false } = {}) {
			if (instant) jump(1);
			else if (goal !== 1) play(1);
		},
		toggle() {
			play(goal === 0 ? 1 : 0);
		},
		set(next) {
			options = { ...options, ...next };
			if (animation && animation.playbackRate !== speed())
				animation.updatePlaybackRate(speed());
		},
		destroy() {
			stop();
			target.reveal();
		},
	};
}

// The quads' edges and the vertices, on the screen.
function meshLines({ columns, points }: Mesh) {
	const vertices: Point[] = [];
	for (let k = 0; k < points.length; k += 4)
		vertices.push({ x: points[k + 2], y: points[k + 3] });
	return [gridLines(vertices, columns - 1), vertices] as const;
}

function pickEdge(
	edge: Edge | "auto" = "bottom",
	window: HTMLElement,
	target: HTMLElement,
): Edge {
	if (edge !== "auto") return edge;
	const from = window.getBoundingClientRect();
	const to = target.getBoundingClientRect();
	const x = to.left + to.width / 2 - (from.left + from.width / 2);
	const y = to.top + to.height / 2 - (from.top + from.height / 2);
	if (Math.abs(y) >= Math.abs(x)) return y >= 0 ? "bottom" : "top";
	return x >= 0 ? "right" : "left";
}

// Keeps the element visible while progress is under HANDOFF, where the copies
// are still fading in over it.
function handoff(from: number, to: number): Keyframe[] {
	const hidden = { visibility: "hidden" };
	const visible = { visibility: "visible" };
	const at = (HANDOFF - from) / (to - from);
	if (!(at > 0 && at < 1)) {
		return from < HANDOFF && to < HANDOFF
			? [visible, visible]
			: [hidden, hidden];
	}
	const [before, after] = to > from ? [visible, hidden] : [hidden, visible];
	return [
		{ ...before, offset: 0 },
		{ ...before, offset: at },
		{ ...after, offset: at },
		{ ...after, offset: 1 },
	];
}
