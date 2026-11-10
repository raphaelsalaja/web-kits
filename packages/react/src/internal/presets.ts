import { fromBounce, fromPhysics, type Spring, spring } from "../springs.ts";

const TAU = 2 * Math.PI;

/** A spring from Family's fits, which use mass 1 and keep overdamped ratios. */
const fitted = (stiffness: number, dampingRatio: number) =>
  spring(TAU / Math.sqrt(stiffness), dampingRatio);

/** The `Animation` the layout and crossfades follow. */
export const animations = {
  smooth: spring(0.5, 1),
  snappy: fromBounce(0.5, 0.15),
  bouncy: fromBounce(0.5, 0.3),
} satisfies Record<string, Spring>;

export type AnimationName = keyof typeof animations;

/**
 * `ContentTransition.numericText`, from `makeRBTransition` in SwiftUICore.
 * The glyph effects run on RenderBox's own springs whatever the `Animation`
 * is; only the layout follows it.
 */
export const numericText = {
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

/** Family's wallet, measured from a 60 fps screen recording. */
export const family = {
  /** Shared characters slide, others fade, and the width follows. */
  layout: fitted(803, 1.05),
  /** Each digit wheel spins through the digits in between. */
  wheel: fitted(520, 0.95),
  /** The amount on the keypad. */
  input: {
    enter: fitted(699, 0.93),
    exit: fitted(5000, 2.36),
    slide: fitted(1300, 1),
    /** Travel in cap heights. */
    enterOffset: 1.6,
    exitOffset: 1.55,
  },
};
