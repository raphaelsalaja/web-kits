// The iOS 18 zoom transition. The source grows into the pushed screen on the
// spec's 0.4 s spring while the screen behind recedes by a fixed number of
// points and dims. The spring it really runs is still an open question in the
// ledger: the recede fits 0.35 s with an initial velocity better than 0.4 s.

import type { Rect } from "../geometry.ts";
import { uikit } from "../spring.ts";

const { zoom: spec } = uikit;

export const ZOOM = {
  spring: spec.spring,
  cornerRadius: spec.cornerRadius,
  dimming: spec.dimming,
  shadow: spec.shadow,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The screen behind's scale once receded: 34.67 points narrower, at least 0.8. */
export function recededScale(width: number) {
  return Math.max(1 - spec.recede / width, spec.minimumScale);
}

/** Progress 0 is the source in place, 1 the pushed screen full size. */
export function zoom(source: Rect, screen: Rect, progress: number) {
  return {
    x: lerp(source.x, screen.x, progress),
    y: lerp(source.y, screen.y, progress),
    width: lerp(source.width, screen.width, progress),
    height: lerp(source.height, screen.height, progress),
    background: lerp(1, recededScale(screen.width), progress),
    dimming: spec.dimming * progress,
  };
}
