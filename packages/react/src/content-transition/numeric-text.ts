import { fromPhysics } from "../animation/spring.ts";
import { overshot, timing } from "../internal/glyphs/timing.ts";
import type { ContentTransition } from "../internal/glyphs/transition.ts";

/**
 * Measured from `makeRBTransition` in SwiftUICore. The glyph effects run on
 * RenderBox's own springs whatever the `Animation` is; only the layout
 * follows it.
 */
export const measured = {
  /** Alpha, blur and scale: `addSpringDuration(0.5, mass 1, 344, 37)`. */
  fade: fromPhysics(1, 344, 37),
  /** Relative translation: `addSpringDuration(0.8, mass 2, 470, 34)`. */
  move: fromPhysics(2, 470, 34),
  /** How far a glyph travels, in em. */
  offset: 0.44,
  /** `scale-center` with 51/128. */
  scale: 51 / 128,
  /** Blur sigma at the far end, in em. */
  blur: 0.07,
  /** Old glyphs fade 7% past zero, so they are gone before the move ends. */
  fadeOut: 1.07,
  /** The changed glyphs start across 18/120 s, left to right. */
  stagger: 0.15,
};

export type NumericTextOptions = {
  /**
   * Brings new glyphs in from above. Left out, numbers follow their value,
   * up when it grows and down when it shrinks, and text comes in from below.
   */
  countsDown?: boolean;
};

/**
 * SwiftUI's `.numericText()`. Changed glyphs blur, shrink and slide out as
 * new ones come in, staggered left to right.
 */
export function numericText({
  countsDown,
}: NumericTextOptions = {}): ContentTransition & {
  readonly targets: { readonly text: true; readonly number: true };
} {
  const { fade, move, offset, scale, blur, fadeOut, stagger } = measured;
  return {
    targets: { text: true, number: true },
    countsDown,
    stagger,
    plan: ({ direction }) => ({
      enter(el, _, delay) {
        el.animate(
          { transform: [`translateY(${direction * offset}em)`, "none"] },
          timing(move, delay),
        );
        el.animate(
          {
            opacity: [0, 1],
            scale: [String(scale), "1"],
            filter: [`blur(${blur}em)`, "blur(0)"],
          },
          timing(fade, delay),
        );
      },
      leave(clone, _, delay) {
        return [
          clone.animate(
            { transform: `translateY(${-direction * offset}em)` },
            { ...timing(move, delay), fill: "both" },
          ),
          clone.animate(
            { scale: String(scale), filter: `blur(${blur}em)` },
            { ...timing(fade, delay), fill: "both" },
          ),
          clone.animate({ opacity: 0 }, overshot(fade, fadeOut, delay)),
        ];
      },
    }),
  };
}
