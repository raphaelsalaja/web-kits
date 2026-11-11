import { type Spring, spring } from "../animation/spring.ts";

/** A spring from Family's fits, which use mass 1 and keep overdamped ratios. */
const fitted = (stiffness: number, dampingRatio: number): Spring =>
  spring((2 * Math.PI) / Math.sqrt(stiffness), dampingRatio);

/** Family's wallet, measured from a 60 fps screen recording. */
export const measured = {
  /** Shared characters slide, others fade, and the width follows. */
  layout: fitted(803, 1.05),
  /** Each digit wheel spins through the digits in between. */
  wheel: fitted(520, 0.95),
  /**
   * The amount on the keypad. New digits rise as the others slide over, and
   * deleted ones fall away slowly enough to see them drop.
   */
  input: {
    enter: fitted(5200, 1.42),
    exit: fitted(248, 0.85),
    slide: fitted(1300, 1),
    /** A digit typed over the 0 shown before typing, and the 0 it pushes out. */
    push: fitted(740, 0.9),
    /** Travel in cap heights. */
    enterOffset: 1.38,
    exitOffset: 2.44,
    /** A digit typed over another pushes it this far, out of the window. */
    pushOffset: 1.5,
    /**
     * Seconds a separator that ends up between other digits stays dropped
     * out while it slides across, before it rises back in.
     */
    rejoin: 0.055,
  },
};
