import { curve } from "../internal/glyphs/timing.ts";
import type { ContentTransition } from "../internal/glyphs/transition.ts";

const PROPERTIES = [
  "color",
  "font-size",
  "font-weight",
  "font-variation-settings",
  "letter-spacing",
].join(", ");

/**
 * SwiftUI's `.interpolate`: crossfades the label and eases its colour, size
 * and weight.
 */
export const interpolate = {
  targets: { text: true, number: true },
  whole: "crossfade",
  style: (layout) => ({
    transitionProperty: PROPERTIES,
    transitionDuration: `${curve(layout).duration}ms`,
    transitionTimingFunction: curve(layout).easing,
  }),
} as const satisfies ContentTransition;
