import type { ContentTransition } from "../internal/glyphs/transition.ts";

/** SwiftUI's `.opacity`, the default for `Text`: crossfades the whole label. */
export const opacity = {
  targets: { text: true, number: true },
  whole: "crossfade",
} as const satisfies ContentTransition;
