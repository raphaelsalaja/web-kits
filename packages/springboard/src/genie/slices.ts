import { cloneWindow } from "./clone.ts";
import type { Mesh } from "./mesh.ts";

// Copies of the window, one per mesh quad, each clipped to its strip and
// projected onto the quad with matrix3d. A projective fill matches the
// compositor's own fill as closely as a bilinear one at these quad sizes.
export function createSlices(
	layer: HTMLElement,
	source: HTMLElement,
	width: number,
	height: number,
) {
	const template = cloneWindow(source, width, height);
	// The shadow is drawn once underneath, so strips don't seam it.
	template.style.boxShadow = "none";
	const pool: { strip: HTMLDivElement; copy: HTMLElement }[] = [];

	const slice = (index: number) => {
		let item = pool[index];
		if (!item) {
			const strip = document.createElement("div");
			strip.setAttribute("aria-hidden", "true");
			const style = strip.style;
			style.position = "absolute";
			style.left = "0";
			style.top = "0";
			style.overflow = "hidden";
			style.transformOrigin = "0 0";
			style.pointerEvents = "none";
			style.backfaceVisibility = "hidden";
			const copy = template.cloneNode(true) as HTMLElement;
			strip.append(copy);
			layer.append(strip);
			item = { strip, copy };
			pool[index] = item;
		}
		return item;
	};

	return {
		draw(mesh: Mesh) {
			const { columns, rows, points } = mesh;
			const at = (c: number, r: number) => (r * columns + c) * 4;
			const across = columns === 2;
			const count = across ? rows - 1 : columns - 1;
			let used = 0;

			for (let i = 0; i < count; i++) {
				// Corners in order top left, top right, bottom right, bottom left.
				const tl = across ? at(0, i) : at(i, 0);
				const tr = across ? at(1, i) : at(i + 1, 0);
				const br = across ? at(1, i + 1) : at(i + 1, 1);
				const bl = across ? at(0, i + 1) : at(i, 1);
				const u0 = points[tl];
				const v0 = points[tl + 1];
				const u1 = points[br];
				const v1 = points[br + 1];
				const w = u1 - u0;
				const h = v1 - v0;
				if (w < 0.01 || h < 0.01) continue;

				const screen = [tl, tr, br, bl].flatMap((k) => [
					points[k + 2],
					points[k + 3],
				]);
				const matrix = quadMatrix(screen, w, h);
				if (!matrix) continue;

				// Overlap neighbours by half a screen pixel so antialiased edges
				// don't leave hairlines between strips.
				const local = across ? h : w;
				const travelled = across
					? Math.hypot(screen[6] - screen[0], screen[7] - screen[1])
					: Math.hypot(screen[2] - screen[0], screen[3] - screen[1]);
				const pad = Math.min(
					local / 2,
					(0.5 * local) / Math.max(travelled, 0.5),
				);

				const padX = across ? 0 : pad;
				const padY = across ? pad : 0;

				const { strip, copy } = slice(used++);
				strip.style.display = "block";
				strip.style.width = `${w + padX * 2}px`;
				strip.style.height = `${h + padY * 2}px`;
				strip.style.transform = `${matrix} translate(${-padX}px, ${-padY}px)`;
				copy.style.translate = `${padX - u0}px ${padY - v0}px`;
			}
			for (let i = used; i < pool.length; i++)
				pool[i].strip.style.display = "none";
		},
		dispose() {
			for (const item of pool) item.strip.remove();
			pool.length = 0;
		},
	};
}

// The matrix3d taking the rect (0, 0, w, h) onto a quad given as
// [tlx, tly, trx, try, brx, bry, blx, bly].
export function quadMatrix(q: number[], w: number, h: number) {
	const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
	const dx1 = x1 - x2;
	const dx2 = x3 - x2;
	const dx3 = x0 - x1 + x2 - x3;
	const dy1 = y1 - y2;
	const dy2 = y3 - y2;
	const dy3 = y0 - y1 + y2 - y3;
	let g = 0;
	let k = 0;
	if (Math.abs(dx3) > 1e-6 || Math.abs(dy3) > 1e-6) {
		const det = dx1 * dy2 - dx2 * dy1;
		if (Math.abs(det) < 1e-9) return null;
		g = (dx3 * dy2 - dx2 * dy3) / det;
		k = (dx1 * dy3 - dx3 * dy1) / det;
	}
	const a = x1 - x0 + g * x1;
	const b = x3 - x0 + k * x3;
	const d = y1 - y0 + g * y1;
	const e = y3 - y0 + k * y3;
	const values = [
		a / w,
		d / w,
		0,
		g / w,
		b / h,
		e / h,
		0,
		k / h,
		0,
		0,
		1,
		0,
		x0,
		y0,
		0,
		1,
	];
	if (values.some((v) => !Number.isFinite(v))) return null;
	return `matrix3d(${values.map((v) => +v.toFixed(8)).join(",")})`;
}
