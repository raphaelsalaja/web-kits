/**
 * The text caret from iOS 27 and macOS 27, read from UITextView's
 * `UIStandardTextCursorView` in the Simulator and from NSTextView's
 * `NSTextInsertionIndicator`, both through Core Animation and the UIKit spring
 * calls that drive them. Lengths are px, times are seconds.
 */
import { fromPhysics, type Spring, spring } from "../animation/spring.ts";

/**
 * The blink both platforms share: a second long, stepping down in quarters
 * over 0.15s, off for 0.2375s, then back up in quarters. It starts solid, so
 * restarting it on every keystroke holds the caret on while typing.
 */
export const BLINK = {
  period: 1,
  offsets: [0, 0.5375, 0.575, 0.6125, 0.65, 0.8875, 0.925, 0.9625, 1],
  opacity: [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75, 1],
} as const;

export type Style = {
  /** The bar's width. */
  width: number;
  /** The bar's corner radius. */
  radius: number;
  /** How much longer than the blink's own half second the caret stays solid after a move. */
  hold: number;
  /** The fade when a selection, focus or blur hides or shows the caret, or 0 to cut. */
  fade: number;
  /** The curve of that fade. */
  fadeEasing: string;
};

/**
 * `UIStandardTextCursorView`: a 2pt bar with square ends, solid for half a
 * second after a move. Selections and focus hide and show it at once.
 */
export const IOS: Style = {
  width: 2,
  radius: 0,
  hold: 0,
  fade: 0,
  fadeEasing: "linear",
};

/**
 * `NSTextInsertionIndicator`: a 2pt bar with 1.1pt corners, solid for 0.65s
 * after a move. It fades over 0.25s on Core Animation's default curve, the
 * same as CSS `ease`.
 */
export const MACOS: Style = {
  width: 2,
  radius: 1.1,
  hold: 0.15,
  fade: 0.25,
  fadeEasing: "ease",
};

/**
 * The spring the floating cursor follows the finger on, and settles back
 * with when the spacebar is let go: critically damped, 0.18s.
 */
export const FOLLOW: Spring = spring(0.18, 1);

/**
 * `UITextCursorDropPositionAnimator`'s spring for sliding the caret to where
 * a drag will drop: tension 400 and friction 35, which overshoots a little.
 */
export const DROP: Spring = fromPhysics(1, 400, 35);
