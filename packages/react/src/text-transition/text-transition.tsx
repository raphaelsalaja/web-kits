"use client";

import { type HTMLAttributes, useLayoutEffect, useRef } from "react";
import { opacity } from "../content-transition/opacity.ts";
import { GlyphText } from "../internal/glyphs/glyph-text.tsx";
import { byDiff, type Part } from "../internal/glyphs/parts.ts";
import {
  resolve,
  type TransitionAnimation,
} from "../internal/glyphs/resolve.ts";
import type { TextContentTransition } from "../internal/glyphs/transition.ts";

export type TextTransitionProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  children: string;
  /** How the label changes. `opacity`, SwiftUI's default for `Text`. */
  transition?: TextContentTransition;
  /** What the width, kept characters and crossfades follow. */
  animation?: TransitionAnimation;
};

type Committed = { parts: Part[]; generation: number };

export function TextTransition({
  children,
  transition = opacity,
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
      transition={transition}
      layout={resolve(animation, transition.layout)}
      direction={transition.countsDown ? -1 : 1}
    />
  );
}
