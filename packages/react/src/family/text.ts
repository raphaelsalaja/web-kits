import type { ContentTransition } from "../internal/glyphs/transition.ts";
import { measured } from "./measured.ts";

/**
 * Family's wallet labels. Characters both labels share slide into place and
 * the rest fade, held still while the width moves.
 */
export const text = {
  targets: { text: true },
  layout: measured.layout,
  hold: true,
} as const satisfies ContentTransition;
