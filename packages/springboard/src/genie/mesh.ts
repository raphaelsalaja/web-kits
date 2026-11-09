// The Dock's Genie mesh (Dock, macOS 27.0.1, FUN_100071d38 and FUN_1000726dc),
// ported instruction by instruction. Rects use a top-left origin. Values are
// rounded to float32 where the Dock stores them, so the mesh matches what the
// Dock sends to SLSTransactionSetWindowWarp.

// biome-ignore-all lint/complexity/useMathMinMax: these are the Dock's fcsel selects, which differ from Math.min and Math.max for NaN and -0

import type { Rect } from "../geometry.ts";

export type Edge = "top" | "bottom" | "left" | "right";

export type Mesh = {
	columns: number;
	rows: number;
	// Four floats per vertex, row by row: local x, local y, screen x, screen y.
	points: Float32Array;
};

// The Dock plays the mesh linearly over half a second, in both directions.
export const GENIE_DURATION = 0.5;

const f = Math.fround;
const PI = Math.PI;
const CAPACITY = 1200;
const TOLERANCE = 0.6;
const MAX_CALLS = 64;

const ease = (cosine: number) => cosine * -0.5 + 0.5;

type Counter = { calls: number };

// Splits [a, b] until the eased edge offsets are within TOLERANCE of a straight
// line, writing (position, left offset, right offset) triples in order.
function subdivide(
	buffer: Float32Array,
	offset: number,
	a: number,
	b: number,
	start: number,
	left: number,
	right: number,
	span: number,
	counter: Counter,
): number {
	const divisor = span;
	const atB = ease(Math.cos(((b - start) * PI) / divisor));
	counter.calls += 1;
	if (counter.calls > MAX_CALLS) return 0;

	const rightB = f(right * atB);
	const leftB = f(left * atB);
	let written = 0;
	let from = a;
	let at = offset;

	for (;;) {
		const length = Math.abs(b - from);
		if (length < 8) return written;
		const mid = (b + from) * 0.5;
		const atFrom = Math.cos(((from - start) * PI) / divisor);
		const atMid = ease(Math.cos(((mid - start) * PI) / divisor));
		const leftMid = f(left * atMid);
		const rightMid = f(right * atMid);

		if (length < 128) {
			const eased = ease(atFrom);
			const leftFrom = f(left * eased);
			const leftChord = Math.abs(f(leftB + leftFrom) * 0.5 - leftMid);
			if (leftChord < TOLERANCE) {
				const rightFrom = f(right * eased);
				const rightChord = Math.abs(f(rightB + rightFrom) * 0.5 - rightMid);
				if (rightChord < TOLERANCE) return written;
			}
		}

		const count = subdivide(
			buffer,
			at,
			from,
			mid,
			start,
			left,
			right,
			span,
			counter,
		);
		const index = count + at;
		if (index > CAPACITY - 1) return written;
		buffer[index] = mid;
		buffer[index + 1] = leftMid;
		buffer[index + 2] = rightMid;
		if (index > CAPACITY - 4) return written;
		at = index + 3;
		written += count + 3;
		counter.calls += 1;
		from = mid;
		if (counter.calls >= MAX_CALLS + 1) return written;
	}
}

type Axis = {
	// Where the window's far side starts, and its signed length along the axis.
	far: number;
	length: number;
	// The icon's near and far sides along the axis.
	near: number;
	iconFar: number;
	// How far each side edge has to move to meet the icon.
	left: number;
	right: number;
	overlap: number;
	travel: number;
};

function axis(window: Rect, icon: Rect, edge: Edge): Axis {
	const { x: ax, y: ay, width: aw, height: ah } = window;
	const { x: bx, y: by, width: bw, height: bh } = icon;
	if (edge === "bottom") {
		const gap = by - (ay + ah);
		const overlap = gap > 0 ? 0 : gap;
		return {
			far: ay,
			length: ah,
			near: by,
			iconFar: by + bh,
			left: bx - ax,
			right: bx + bw - (ax + aw),
			overlap,
			travel: overlap >= 0 ? by - ay : ah,
		};
	}
	if (edge === "top") {
		const near = by + bh;
		const far = ay + ah;
		const gap = near - ay;
		const overlap = gap < 0 ? 0 : gap;
		return {
			far,
			length: -ah,
			near,
			iconFar: by,
			left: bx - ax,
			right: bx + bw - (ax + aw),
			overlap,
			travel: overlap <= 0 ? near - far : -ah,
		};
	}
	if (edge === "right") {
		const gap = bx - (ax + aw);
		const overlap = gap > 0 ? 0 : gap;
		return {
			far: ax,
			length: aw,
			near: bx,
			iconFar: bx + bw,
			left: by - ay,
			right: by + bh - (ay + ah),
			overlap,
			travel: overlap >= 0 ? bx - ax : aw,
		};
	}
	const near = bx + bw;
	const far = ax + aw;
	const gap = near - ax;
	const overlap = gap < 0 ? 0 : gap;
	return {
		far,
		length: -aw,
		near,
		iconFar: bx,
		left: by - ay,
		right: by + bh - (ay + ah),
		overlap,
		travel: overlap <= 0 ? near - far : -aw,
	};
}

function timing(p: number, a: Axis) {
	const sides = (Math.abs(a.left) + Math.abs(a.right)) * 0.125;
	const squeeze = Math.abs(a.overlap + a.overlap);
	const bend = Math.abs(squeeze > sides ? squeeze : sides) * 0.5 + 1;
	const bendLength = Math.trunc(Math.log(bend)) * 50;
	const distance = Math.abs(a.travel);
	const slideLength = Math.trunc(Math.log(distance * 0.5 + 1)) * 50;
	const gap = Math.abs(a.travel - a.length);
	const ratio = (slideLength * gap) / distance / slideLength;
	const reach = slideLength * (Math.acos(ratio * -2 + 1) / PI);

	const narrow = bendLength > reach ? bendLength : reach;
	const lead = bendLength > reach ? bendLength - reach : 0;
	const along = (slideLength + lead) * p;
	const narrowAt = along > narrow ? narrow : along;
	const narrowed = (along < 0 ? 0 : narrowAt) / narrow;
	const slid = along - lead;
	const slideAt = slid > slideLength ? slideLength : slid;
	const slidden = (slid < 0 ? 0 : slideAt) / slideLength;

	const bent = ease(Math.cos(narrowed * PI));
	const poured = ease(Math.cos(slidden * PI));
	return { bent, poured, gap, settled: narrow / (slideLength + lead) };
}

// How far along each phase is: bent for the sides, poured for the slide, both
// eased from 0 to 1. settled is the progress at which the sides finish bending.
export function geniePhases(
	progress: number,
	window: Rect,
	icon: Rect,
	edge: Edge = "bottom",
) {
	return timing(f(progress), axis(window, icon, edge));
}

// The funnel's two sides once fully bent, from the window's far corners to the
// icon's: the paths the mesh rows are drawn along. Screen x, y pairs.
export function genieFunnel(
	window: Rect,
	icon: Rect,
	edge: Edge = "bottom",
	steps = 48,
) {
	const a = axis(window, icon, edge);
	const start = a.far + a.overlap;
	const span = Math.trunc(a.travel + 0.5);
	const vertical = edge === "bottom" || edge === "top";
	const base = vertical ? window.x : window.y;
	const across = vertical ? window.width : window.height;
	const sides: [number[], number[]] = [[], []];
	for (let n = 0; n <= steps; n++) {
		const position = start + (span * n) / steps;
		const eased = ease(Math.cos((n / steps) * PI));
		const near = base + a.left * eased;
		const far = base + across + a.right * eased;
		if (vertical) {
			sides[0].push(near, position);
			sides[1].push(far, position);
		} else {
			sides[0].push(position, near);
			sides[1].push(position, far);
		}
	}
	return sides;
}

// progress is linear: 0 is the open window, 1 is the window inside the icon.
export function genieMesh(
	progress: number,
	window: Rect,
	icon: Rect,
	edge: Edge = "bottom",
): Mesh {
	const a = axis(window, icon, edge);
	const { bent, poured, gap } = timing(f(progress), a);
	const left = a.left * bent;
	const right = a.right * bent;
	const moved = a.travel * poured;
	const span = Math.trunc(a.travel + 0.5);
	const start = a.far + a.overlap * bent;
	const top = start + moved;
	const bottom = a.length + top;
	const toward = edge === "bottom" || edge === "right";
	const clamped = toward
		? bottom <= a.near
			? bottom
			: a.near
		: bottom >= a.near
			? bottom
			: a.near;
	const neck = poured <= 0 ? bottom : clamped;

	const buffer = new Float32Array(CAPACITY);
	const first = ease(Math.cos(((top - start) * PI) / span));
	buffer[0] = top;
	buffer[1] = left * first;
	buffer[2] = right * first;
	const count = subdivide(buffer, 3, top, neck, start, left, right, span, {
		calls: 0,
	});
	const atNeck = ease(Math.cos(((neck - start) * PI) / span));
	buffer[count + 3] = neck;
	buffer[count + 4] = left * atNeck;
	buffer[count + 5] = right * atNeck;
	let floats = count + 6;

	if (Math.abs(moved) > gap) {
		let tail = bottom;
		if (toward) {
			if (tail > a.iconFar) tail = a.iconFar;
		} else if (tail < a.iconFar) tail = a.iconFar;
		buffer[floats] = tail;
		buffer[floats + 1] = left;
		buffer[floats + 2] = right;
		floats += 3;
	}

	return build(buffer, Math.trunc(floats / 3), window, edge);
}

function build(
	buffer: Float32Array,
	count: number,
	window: Rect,
	edge: Edge,
): Mesh {
	const { x: ax, y: ay, width: aw, height: ah } = window;
	const vertical = edge === "bottom" || edge === "top";
	const reversed = edge === "top" || edge === "left";
	const points = new Float32Array(count * 8);
	const firstAt = reversed ? count - 1 : 0;
	const lastAt = reversed ? 0 : count - 1;
	const origin = buffer[firstAt * 3];
	const extent = vertical ? ah : aw;
	const scale = f(extent / (buffer[lastAt * 3] - origin));
	const across = vertical ? aw : ah;
	const breadth = f(across);
	const base = vertical ? ax : ay;

	for (let n = 0; n < count; n++) {
		const i = reversed ? count - 1 - n : n;
		const position = buffer[i * 3];
		const local = f((position - origin) * scale);
		const near = f(base + buffer[i * 3 + 1]);
		const far = f(base + across + buffer[i * 3 + 2]);
		if (vertical) {
			points.set(
				[0, local, near, position, breadth, local, far, position],
				n * 8,
			);
		} else {
			points.set([local, 0, position, near], n * 4);
			points.set([local, breadth, position, far], (count + n) * 4);
		}
	}

	return vertical
		? { columns: 2, rows: count, points }
		: { columns: count, rows: 2, points };
}
