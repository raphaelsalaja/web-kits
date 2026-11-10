import { useInView, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useEffectEvent, useState } from "react";

export const RATES = ["1×", "½×", "¼×", "Still"] as const;
export const SPEEDS = ["1×", "½×", "¼×"] as const;
export const SHUTTERS = ["90°", "180°", "360°"] as const;

export type Rate = (typeof RATES)[number];
export type Speed = (typeof SPEEDS)[number];
export type Shutter = (typeof SHUTTERS)[number];

export const SPEED: Record<Rate, number> = {
  "1×": 1,
  "½×": 0.5,
  "¼×": 0.25,
  Still: 0,
};

const HOLD = 0.6;
const MOVE = 0.45;
const CYCLE = 2 * (HOLD + MOVE);
export const PEAK = HOLD + MOVE / 2;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const dy = (t: number) => (3 * ay * t + 2 * by) * t + cy;

  const solve = (target: number) => {
    let lo = 0;
    let hi = 1;
    let t = target;
    for (let i = 0; i < 24; i++) {
      const error = x(t) - target;
      if (Math.abs(error) < 1e-6) return t;
      if (error > 0) hi = t;
      else lo = t;
      const slope = dx(t);
      const next = slope > 1e-6 ? t - error / slope : (lo + hi) / 2;
      t = next > lo && next < hi ? next : (lo + hi) / 2;
    }
    return t;
  };

  return {
    at: (u: number) => y(solve(u)),
    slope: (u: number) => {
      const t = solve(u);
      const d = dx(t);
      return d > 1e-6 ? dy(t) / d : 0;
    },
  };
}

const travelEase = cubicBezier(0.77, 0, 0.175, 1);

export function sample(time: number): [number, number] {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  if (t < HOLD) return [0, 0];
  if (t < HOLD + MOVE) {
    const u = (t - HOLD) / MOVE;
    return [travelEase.at(u), travelEase.slope(u) / MOVE];
  }
  if (t < 2 * HOLD + MOVE) return [1, 0];
  const u = (t - 2 * HOLD - MOVE) / MOVE;
  return [1 - travelEase.at(u), -travelEase.slope(u) / MOVE];
}

export function shutterFraction(shutter: Shutter) {
  return Number.parseInt(shutter, 10) / 360;
}

function nextFrameTime(frame: number, delta: number) {
  const clamped = Math.min(1 / 30, Math.max(1 / 240, delta));
  return frame + (clamped - frame) * 0.1;
}

export function useFrameLoop(
  stage: RefObject<HTMLElement | null>,
  step: (delta: number, frame: number, now: number) => void,
) {
  const inView = useInView(stage, { amount: 0.3 });
  const onFrame = useEffectEvent(step);

  useEffect(() => {
    if (!inView) return;
    let last = 0;
    let frame = 1 / 60;
    let id = 0;

    const loop = (now: number) => {
      const delta = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      frame = nextFrameTime(frame, delta);
      onFrame(delta, frame, now);
      id = requestAnimationFrame(loop);
    };

    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [inView]);
}

export function useRate() {
  const reduce = useReducedMotion();
  const [rate, setRate] = useState<Rate>("1×");

  useEffect(() => {
    if (reduce) setRate("Still");
  }, [reduce]);

  return [rate, setRate] as const;
}
