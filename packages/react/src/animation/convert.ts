import type { Curve } from "./curve.ts";
import { physics, type Spring, settle, spring, value } from "./spring.ts";

/** A Motion spring transition, slowed by `speed` (0.25 runs four times longer). */
export function toMotion(s: Spring, speed = 1, initialVelocity?: number) {
  const { mass, stiffness, damping } = physics(
    spring(s.response / speed, s.dampingRatio),
  );
  return {
    type: "spring" as const,
    mass,
    stiffness,
    damping,
    ...(initialVelocity === undefined
      ? {}
      : { velocity: initialVelocity * speed }),
  };
}

export type MotionSpring = ReturnType<typeof toMotion>;
export type MotionTween = { duration: number; ease: number[]; delay?: number };

/** A timed curve as a Motion tween, in seconds. */
export function tween(duration: number, curve: Curve, delay = 0): MotionTween {
  return { duration, ease: [...curve], ...(delay ? { delay } : {}) };
}

/** A CSS `linear()` easing and its duration in milliseconds. */
export function toLinear(s: Spring, { samples = 60, threshold = 0.001 } = {}) {
  const duration = settle(s, threshold);
  const points = Array.from({ length: samples + 1 }, (_, i) => {
    const v = i === samples ? 1 : value(s, (i / samples) * duration);
    return Number(v.toFixed(4));
  });
  return {
    easing: `linear(${points.join(", ")})`,
    duration: Math.round(duration * 1000),
  };
}
