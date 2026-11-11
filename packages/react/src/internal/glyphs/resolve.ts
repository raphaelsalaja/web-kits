import { swiftui } from "../../animation/presets.ts";
import type { Spring } from "../../animation/spring.ts";

const named = {
  smooth: swiftui.smooth,
  snappy: swiftui.snappy,
  bouncy: swiftui.bouncy,
};

/** SwiftUI's `.smooth`, `.snappy` and `.bouncy`, or any spring. */
export type TransitionAnimation = keyof typeof named | Spring;

export function resolve(
  animation: TransitionAnimation | undefined,
  fallback: Spring = swiftui.smooth,
) {
  if (animation === undefined) return fallback;
  return typeof animation === "string" ? named[animation] : animation;
}
