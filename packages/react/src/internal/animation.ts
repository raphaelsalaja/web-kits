import type { Spring } from "../springs.ts";
import { type AnimationName, animations } from "./presets.ts";

/** SwiftUI's `.smooth`, `.snappy` and `.bouncy`, or any spring. */
export type TransitionAnimation = AnimationName | Spring;

export function resolve(
  animation: TransitionAnimation | undefined,
  fallback: Spring,
) {
  if (animation === undefined) return fallback;
  return typeof animation === "string" ? animations[animation] : animation;
}
