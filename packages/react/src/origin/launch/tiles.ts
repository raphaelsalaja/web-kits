import { quadMatrix } from "../genie/slices.ts";
import { type MeshVertex, meshPoint } from "./transition.ts";

// The app card drawn through SpringBoard's mesh: a copy of the card per tile,
// each clipped to its piece of the layer and projected onto where Core
// Animation's surface puts that piece's corners. Each tile's first child is
// the card, laid out at the layer's full size.

export const TILE_COLUMNS = 6;
export const TILE_ROWS = 10;

export function drawMesh(
  strips: readonly (HTMLElement | null)[],
  mesh: readonly MeshVertex[],
  width: number,
  height: number,
  columns = TILE_COLUMNS,
  rows = TILE_ROWS,
) {
  const points: { x: number; y: number }[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= columns; c++) {
      points.push(meshPoint(mesh, c / columns, r / rows));
    }
  }
  const at = (c: number, r: number) => points[r * (columns + 1) + c];
  const w = width / columns;
  const h = height / rows;

  strips.forEach((strip, index) => {
    const copy = strip?.firstElementChild;
    if (!strip || !(copy instanceof HTMLElement)) return;
    const c = index % columns;
    const r = Math.floor(index / columns);
    const tl = at(c, r);
    const tr = at(c + 1, r);
    const br = at(c + 1, r + 1);
    const bl = at(c, r + 1);
    const matrix = quadMatrix(
      [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y],
      w,
      h,
    );
    if (!matrix || w < 0.01 || h < 0.01) {
      strip.style.display = "none";
      return;
    }
    // Overlap neighbours by a screen pixel so their antialiased edges don't
    // leave hairlines between tiles, even mid-fade.
    const padX = Math.min(
      w / 2,
      w / Math.max(Math.hypot(tr.x - tl.x, tr.y - tl.y), 0.5),
    );
    const padY = Math.min(
      h / 2,
      h / Math.max(Math.hypot(bl.x - tl.x, bl.y - tl.y), 0.5),
    );
    strip.style.display = "";
    strip.style.width = `${w + padX * 2}px`;
    strip.style.height = `${h + padY * 2}px`;
    strip.style.transform = `${matrix} translate(${-padX}px, ${-padY}px)`;
    copy.style.translate = `${padX - c * w}px ${padY - r * h}px`;
  });
}
