import { type Spring, solve, spring } from "@web-kits/react/animation";

const TAU = 2 * Math.PI;

/**
 * A value moved by springs the way SpringBoard's fluid behaviours move it:
 * retargeting starts a new spring from wherever the value is, keeping its
 * velocity. Time is in seconds, from any clock.
 */
export function createFluid(initial: number) {
  let current = spring(0.5, 1);
  let from = initial;
  let to = initial;
  let speed = 0;
  let start = 0;

  const sample = (now: number) => solve(current, now - start, from, to, speed);

  return {
    sample,
    get target() {
      return to;
    },
    to(target: number, s: Spring, now: number, kick = 0) {
      const state = sample(now);
      current = s;
      from = state.position;
      speed = state.velocity + kick;
      to = target;
      start = now;
    },
    set(value: number, now: number) {
      from = value;
      to = value;
      speed = 0;
      start = now;
    },
  };
}

export type Fluid = ReturnType<typeof createFluid>;

/** Within `epsilon` of its target and barely moving. */
export function atRest(fluid: Fluid, now: number, epsilon = 1e-3) {
  const { position, velocity } = fluid.sample(now);
  return (
    Math.abs(position - fluid.target) < epsilon &&
    Math.abs(velocity) < epsilon * 10
  );
}

/**
 * A fluid spring's `retargetImpulse` starts it moving: the spring's own pull
 * applied for that long, which for a unit distance is impulse × ω².
 */
export function impulseVelocity(s: Spring, impulse: number) {
  const omega = TAU / s.response;
  return impulse * omega * omega;
}
