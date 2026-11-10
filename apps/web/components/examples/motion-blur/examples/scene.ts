"use client";

import type { MotionBlur } from "@web-kits/motion-blur";
import { type RefObject, useEffect } from "react";

export type Scene = {
  /** Draws the scene at `time` seconds. `frame` is the frame time in seconds, 0 for a still. */
  tick: (time: number, frame: number) => void;
  destroy?: () => void;
};

/** The moment the first scene drew, shared so every scene is at the same time. */
let origin = 0;

/**
 * Runs a scene that is a pure function of time, so its loop has no seam. It
 * draws only while on screen, on a clock shared with every other scene, and
 * under reduced motion draws `still` once.
 */
export function useScene(
  ref: RefObject<HTMLElement | null>,
  setup: (root: HTMLElement) => Scene,
  still = 0,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the scene is set up once per mount
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scene = setup(root);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scene.tick(still, 0);
      return scene.destroy;
    }

    let frame = 1 / 60;
    let last = 0;
    let raf = 0;
    const loop = (now: number) => {
      origin ||= now;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (dt)
        frame = Math.min(1 / 30, Math.max(1 / 240, frame * 0.9 + dt * 0.1));
      scene.tick((now - origin) / 1000, frame);
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const seen = new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? run() : pause(),
    );
    seen.observe(root);
    return () => {
      seen.disconnect();
      pause();
      scene.destroy?.();
    };
  }, []);
}

/**
 * Puts the host at `pose(time)` and blurs it through the poses it passes
 * while the shutter is open, so copies follow curves and spins.
 */
export function drive(
  host: HTMLElement,
  blur: MotionBlur | null,
  pose: (time: number) => DOMMatrix,
  time: number,
  frame: number,
) {
  host.style.transform = pose(time).toString();
  blur?.render((t) => pose(time + t * frame));
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const outCubic = (t: number) => 1 - (1 - t) ** 3;
export const outQuint = (t: number) => 1 - (1 - t) ** 5;
export const inOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

/** An underdamped spring from 0 to 1, `t` in seconds. */
export function spring(t: number, omega = 18, zeta = 0.62) {
  if (t <= 0) return 0;
  const decay = Math.exp(-zeta * omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 - decay * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
  );
}

/** Where `time` falls in a loop of `period` seconds: which pass, and how far into it. */
export function phase(time: number, period: number) {
  const pass = Math.floor(time / period);
  return { pass, at: time - pass * period };
}
