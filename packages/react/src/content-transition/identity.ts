import type { ContentTransition } from "../internal/glyphs/transition.ts";

/** SwiftUI's `.identity`: swaps the label with no animation. */
export const identity = {
  targets: { text: true, number: true },
  whole: "swap",
} as const satisfies ContentTransition;
