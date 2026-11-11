import { toLinear } from "../../animation/convert.ts";
import { type Spring, settle, value } from "../../animation/spring.ts";

const curves = new WeakMap<Spring, { easing: string; duration: number }>();

/** A spring's CSS `linear()` easing and duration, sampled once per spring. */
export function curve(spring: Spring) {
  let found = curves.get(spring);
  if (!found) {
    found = toLinear(spring);
    curves.set(spring, found);
  }
  return found;
}

export function timing(spring: Spring, delay = 0): KeyframeAnimationOptions {
  return { ...curve(spring), delay: delay * 1000, fill: "backwards" };
}

/** A spring run `gain` times as far, held at the end once it gets there. */
export function overshot(spring: Spring, gain: number, delay: number) {
  const duration = settle(spring);
  const points = Array.from({ length: 61 }, (_, i) =>
    Number(Math.min(gain * value(spring, (i / 60) * duration), 1).toFixed(4)),
  );
  return {
    easing: `linear(${points.join(", ")})`,
    duration: Math.round(duration * 1000),
    delay: delay * 1000,
    fill: "both" as const,
  };
}
