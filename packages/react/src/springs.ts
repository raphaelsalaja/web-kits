// Apple's springs, as SwiftUI and UIKit describe them: a response (the period
// of the undamped spring, in seconds) and a damping ratio. Duration and bounce
// are the same pair under other names, and mass, stiffness and damping are
// what Core Animation runs.

export type Spring = {
  readonly response: number;
  readonly dampingRatio: number;
};

const TAU = 2 * Math.PI;

export function spring(response: number, dampingRatio = 1): Spring {
  return { response, dampingRatio };
}

/** `Spring(duration:bounce:)`. Negative bounce overdamps. */
export function fromBounce(duration: number, bounce = 0): Spring {
  return spring(duration, bounce >= 0 ? 1 - bounce : 1 / (1 + bounce));
}

/**
 * `Spring(mass:stiffness:damping:)` and `CASpringAnimation`. Both clamp the
 * damping ratio to 1, so an overdamped triple moves critically damped with
 * the same response.
 */
export function fromPhysics(
  mass: number,
  stiffness: number,
  damping: number,
): Spring {
  return spring(
    TAU * Math.sqrt(mass / stiffness),
    Math.min(damping / (2 * Math.sqrt(stiffness * mass)), 1),
  );
}

/**
 * UIKit's `animate(withDuration:usingSpringWithDamping:)`, which picks the
 * stiffness that settles within `duration`: to 0.00075 of the distance on the
 * envelope when underdamped, and to 0.001 when critically damped.
 */
export function fromSettling(duration: number, dampingRatio: number): Spring {
  const ratio = Math.min(dampingRatio, 1);
  if (ratio < 1) {
    const omega = -Math.log(0.00075) / (ratio * duration);
    return spring(TAU / omega, ratio);
  }
  // Solve (1 + x)e^-x = 0.001 for x = ωT.
  let x = 9;
  for (let i = 0; i < 32; i++) {
    const f = (1 + x) * Math.exp(-x) - 0.001;
    const slope = -x * Math.exp(-x);
    const next = x - f / slope;
    if (Math.abs(next - x) < 1e-14) break;
    x = next;
  }
  return spring((TAU * duration) / x, 1);
}

export function bounce(s: Spring) {
  return s.dampingRatio <= 1 ? 1 - s.dampingRatio : 1 / s.dampingRatio - 1;
}

export function physics(s: Spring, mass = 1) {
  const omega = TAU / s.response;
  return {
    mass,
    stiffness: mass * omega * omega,
    damping: 2 * s.dampingRatio * omega * mass,
  };
}

type State = { position: number; velocity: number };

/**
 * Where a spring is after `time` seconds, starting `from` with `velocity`
 * and heading for `to`. Velocity is in the same units as the positions, per
 * second.
 */
export function solve(
  s: Spring,
  time: number,
  from = 0,
  to = 1,
  velocity = 0,
): State {
  const omega = TAU / s.response;
  const zeta = s.dampingRatio;
  const x0 = from - to;
  const v0 = velocity;
  const t = Math.max(time, 0);
  let x: number;
  let v: number;
  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * t);
    const a = x0;
    const b = (v0 + zeta * omega * x0) / wd;
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    x = decay * (a * cos + b * sin);
    v =
      decay *
      ((b * wd - zeta * omega * a) * cos - (a * wd + zeta * omega * b) * sin);
  } else if (zeta === 1) {
    const decay = Math.exp(-omega * t);
    const b = v0 + omega * x0;
    x = decay * (x0 + b * t);
    v = decay * (b - omega * (x0 + b * t));
  } else {
    const root = omega * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * omega + root;
    const r2 = -zeta * omega - root;
    const c2 = (v0 - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    v = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
  }
  return { position: to + x, velocity: v };
}

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

/** `Spring.value(target: 1, initialVelocity:time:)` from 0. */
export function value(s: Spring, time: number, velocity = 0) {
  return solve(s, time, 0, 1, velocity).position;
}

/** `Spring.velocity(target: 1, initialVelocity:time:)` from 0. */
export function velocity(s: Spring, time: number, initial = 0) {
  return solve(s, time, 0, 1, initial).velocity;
}

/** The last moment the spring is more than `threshold` of the distance away. */
export function settle(s: Spring, threshold = 0.001, velocity = 0) {
  const step = 1 / 240;
  let last = 0;
  for (let t = 0; t < 10; t += step) {
    if (Math.abs(1 - value(s, t, velocity)) > threshold) last = t + step;
  }
  return last;
}

/**
 * A fluid spring's `retargetImpulse` starts it moving: the spring's own pull
 * applied for that long, which for a unit distance is impulse × ω².
 */
export function impulseVelocity(s: Spring, impulse: number) {
  const omega = TAU / s.response;
  return impulse * omega * omega;
}

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
