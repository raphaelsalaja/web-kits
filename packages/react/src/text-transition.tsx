"use client";

import { type HTMLAttributes, useLayoutEffect, useRef } from "react";
import { resolve, type TransitionAnimation } from "./internal/animation.ts";
import { GlyphText } from "./internal/glyph-text.tsx";
import { byDiff, type Part } from "./internal/glyphs.ts";
import { animations, family } from "./internal/presets.ts";

export type { TransitionAnimation } from "./internal/animation.ts";

export type TextTransitionKind =
  | "opacity"
  | "interpolate"
  | "identity"
  | "numericText"
  | "family";

export type TextTransitionProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  children: string;
  /**
   * `opacity`, SwiftUI's default for `Text`, crossfades the whole label, as
   * does `interpolate`, which also eases colour, size and weight. `identity`
   * swaps it. `numericText` is `.numericText(countsDown:)`, and `family`
   * slides the characters both texts share like Family's wallet.
   */
  transition?: TextTransitionKind;
  /** For `numericText`, brings new characters in from above. */
  countsDown?: boolean;
  /** What the width, kept characters and crossfades follow. */
  animation?: TransitionAnimation;
};

type Committed = { parts: Part[]; generation: number };

export function TextTransition({
  children,
  transition = "opacity",
  countsDown = false,
  animation,
  ...props
}: TextTransitionProps) {
  const committed = useRef<Committed>(null);
  const previous = committed.current;
  const generation = (previous?.generation ?? 0) + 1;
  const parts = byDiff(previous?.parts ?? [], children, generation);

  useLayoutEffect(() => {
    committed.current = { parts, generation };
  });

  return (
    <GlyphText
      {...props}
      parts={parts}
      label={children}
      kind={transition}
      layout={resolve(
        animation,
        transition === "family" ? family.layout : animations.smooth,
      )}
      direction={countsDown ? -1 : 1}
    />
  );
}
