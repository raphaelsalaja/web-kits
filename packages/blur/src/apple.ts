/**
 * The soft scroll edge from iOS 27, read from the layer tree in the
 * Simulator and fitted to screenshots of it. Blurs are standard deviations
 * in px, the same as CSS `blur()`.
 */

/**
 * The mask Apple draws its blur through, sampled at 11 evenly spaced points
 * from the end at the bar (1) to the end over the content (0).
 */
export const CURVE = [
  1, 0.9804, 0.9239, 0.829, 0.6957, 0.5373, 0.3749, 0.2259, 0.1114, 0.0361, 0,
] as const;

/**
 * The variable blur's standard deviation against the mask, as pairs of mask
 * and blur, fitted to light, dark and colour captures. It isn't proportional
 * to the mask: towards the far end it holds near half a pixel until the mask
 * is almost 0.
 */
export const SHARP = [
  [0, 0],
  [0.025, 0.37],
  [0.05, 0.5],
  [0.1, 0.6],
  [0.2, 0.84],
  [0.3, 1.08],
  [0.4, 1.26],
  [0.5, 1.42],
  [0.6, 1.61],
  [0.7, 1.95],
  [0.8, 2.27],
  [0.9, 2.56],
  [1, 2.88],
] as const;

export type Recipe = {
  /** The second, wider blur blended over the variable one. */
  fill: number;
  /** How much of the wide blur goes over the sharp one, by blend mode, where the mask is 1. */
  normal: number;
  lighten: number;
  darken: number;
  /** The page's background colour painted under both blurs, where the mask is 1. */
  veil: number;
};

export const SOFT: { light: Recipe; dark: Recipe } = {
  light: { fill: 29.6, normal: 0.25, lighten: 0.6, darken: 0.4, veil: 0.5 },
  dark: { fill: 29.6, normal: 0, lighten: 0.4, darken: 0.6, veil: 0.6 },
};

/**
 * Where the mask leaves 1 and where it reaches 0, as fractions of the edge's
 * height. Under a navigation bar it holds for the first third. Under a tab
 * bar it starts falling straight away and ends at 0.954.
 */
export const TOP = { start: 0.34, end: 0.97 };
export const BOTTOM = { start: 0, end: 0.954 };
