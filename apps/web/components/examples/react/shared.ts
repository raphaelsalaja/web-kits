import type { TransitionAnimation } from "@web-kits/react/number-transition";

export const ANIMATIONS = ["Smooth", "Snappy", "Bouncy"] as const;
export type AnimationName = (typeof ANIMATIONS)[number];

export const ANIMATION: Record<AnimationName, TransitionAnimation> = {
  Smooth: "smooth",
  Snappy: "snappy",
  Bouncy: "bouncy",
};
