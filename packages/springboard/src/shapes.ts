// The continuous corner UIKit's `_setContinuousCornerRadius` and SwiftUI's
// `RoundedRectangle(style: .continuous)` draw: three cubics a corner, which
// start further along each side than a circular arc would. On a short side
// the corner starts from the side's middle instead.

/** How far along a side the corner starts, in radii, when the side allows. */
const REACH = 1.52866483;

type Point = [number, number];

function corner(
  at: Point,
  along: Point,
  next: Point,
  from: number,
  to: number,
  r: number,
) {
  const p = (a: number, b: number) =>
    `${(at[0] + (a * along[0] + b * next[0]) * r).toFixed(2)} ${(
      at[1] + (a * along[1] + b * next[1]) * r
    ).toFixed(2)}`;
  const near = (s: number) => 0.96 + 0.24305 * (s - 1);
  const far = (s: number) => 0.82 + 0.091566 * (s - 1);
  return [
    `L ${p(from, 0)}`,
    `C ${p(near(from), 0)} ${p(far(from), 0)} ${p(0.631494, 0.0749114)}`,
    `C ${p(0.372824, 0.16906)} ${p(0.16906, 0.372824)} ${p(0.0749114, 0.631494)}`,
    `C ${p(0, far(to))} ${p(0, near(to))} ${p(0, to)}`,
  ].join(" ");
}

/** A continuous rounded rectangle as an SVG path, clockwise from the top left. */
export function continuousRect(width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) return `M 0 0 H ${width} V ${height} H 0 Z`;
  const across = Math.min(REACH, width / 2 / r);
  const down = Math.min(REACH, height / 2 / r);
  return [
    `M ${(across * r).toFixed(2)} 0`,
    corner([width, 0], [-1, 0], [0, 1], across, down, r),
    corner([width, height], [0, -1], [-1, 0], down, across, r),
    corner([0, height], [1, 0], [0, -1], across, down, r),
    corner([0, 0], [0, 1], [1, 0], down, across, r),
    "Z",
  ].join(" ");
}
