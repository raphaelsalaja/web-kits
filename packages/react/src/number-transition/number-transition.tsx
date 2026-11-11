"use client";

import { type HTMLAttributes, useLayoutEffect, useMemo, useRef } from "react";
import { numericText } from "../content-transition/numeric-text.ts";
import { GlyphText } from "../internal/glyphs/glyph-text.tsx";
import {
  byPlace,
  byTyping,
  digitCount,
  type Part,
} from "../internal/glyphs/parts.ts";
import {
  resolve,
  type TransitionAnimation,
} from "../internal/glyphs/resolve.ts";
import type { NumberContentTransition } from "../internal/glyphs/transition.ts";

export type NumberTransitionProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  value: number;
  /** Passed to `Intl.NumberFormat`. */
  format?: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
  /** How the digits change. `numericText()` by default. */
  transition?: NumberContentTransition;
  /** What the width, kept digits and crossfades follow. */
  animation?: TransitionAnimation;
};

type Committed = { value: number; parts: Part[]; generation: number };

const NUMERIC_TEXT = numericText();

export function NumberTransition({
  value,
  format,
  locales,
  transition = NUMERIC_TEXT,
  animation,
  ...props
}: NumberTransitionProps) {
  const options = JSON.stringify(format ?? {});
  // biome-ignore lint/correctness/useExhaustiveDependencies: `options` stands in for `format`.
  const formatter = useMemo(
    () => new Intl.NumberFormat(locales, format),
    [locales, options],
  );
  const committed = useRef<Committed>(null);
  const previous = committed.current;
  const formatted = formatter.formatToParts(value);
  const generation = (previous?.generation ?? 0) + 1;
  const parts = transition.typing
    ? byTyping(previous?.parts ?? [], formatted, generation)
    : byPlace(formatted);

  let direction: 1 | -1 = 1;
  if (transition.countsDown !== undefined)
    direction = transition.countsDown ? -1 : 1;
  // Typed numbers show 0 before anything is typed, so it counts as none.
  else if (previous && transition.typing)
    direction =
      (value ? digitCount(parts) : 0) <
      (previous.value ? digitCount(previous.parts) : 0)
        ? -1
        : 1;
  else if (previous) direction = value < previous.value ? -1 : 1;

  useLayoutEffect(() => {
    committed.current = { value, parts, generation };
  });

  return (
    <GlyphText
      {...props}
      parts={parts}
      label={formatted.map((part) => part.value).join("")}
      transition={transition}
      layout={resolve(animation, transition.layout)}
      direction={direction}
    />
  );
}
