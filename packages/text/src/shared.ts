import type { Transition } from "motion/react";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export const splitGraphemes = (s: string): string[] =>
  Array.from(segmenter.segment(s), (seg) => seg.segment);

export const isDigit = (c: string) => c >= "0" && c <= "9";

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export const DIGIT_DISTANCE = 8;

export const animations = {
  default: { duration: 0.38, ease: [0.19, 1, 0.22, 1] },
  smooth: { type: "spring", duration: 0.4, bounce: 0 },
  snappy: { type: "spring", duration: 0.35, bounce: 0.15 },
  bouncy: { type: "spring", duration: 0.5, bounce: 0.3 },
} satisfies Record<string, Transition>;

export type Animation = keyof typeof animations;
