// Core Animation's named timing functions, read back with
// `CAMediaTimingFunction.getControlPoint`. CSS's keywords are the same curves:
// `ease` is the default, and `ease-in`, `ease-out` and `ease-in-out` are
// easeIn, easeOut and easeInEaseOut. Core Animation stores them as 32-bit
// floats, so 0.42 reads back as 0.41999998688697815.

export type Curve = readonly [number, number, number, number];

export const CURVES = {
  linear: [0, 0, 1, 1],
  default: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInEaseOut: [0.42, 0, 0.58, 1],
} as const satisfies Record<string, Curve>;

/** Solves a cubic Bézier timing function for x, the way WebKit's UnitBezier does. */
export function cubicBezier([x1, y1, x2, y2]: Curve) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-7) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let low = 0;
    let high = 1;
    t = x;
    while (low < high) {
      const sample = sampleX(t);
      if (Math.abs(sample - x) < 1e-7) return t;
      if (x > sample) low = t;
      else high = t;
      t = (low + high) / 2;
      if (high - low < 1e-9) break;
    }
    return t;
  };

  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)));
}

export function toCSS([x1, y1, x2, y2]: Curve) {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

/** SwiftUI's `UnitCurve.circularEaseIn`, a quarter circle. */
export const circularEaseIn = (t: number) => 1 - Math.sqrt(1 - t * t);

export const circularEaseOut = (t: number) => Math.sqrt(1 - (t - 1) ** 2);

export const circularEaseInOut = (t: number) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (1 + Math.sqrt(1 - (2 * t - 2) ** 2)) / 2;
