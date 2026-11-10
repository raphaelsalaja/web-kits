"use client";

import { type HTMLAttributes, useLayoutEffect, useMemo, useRef } from "react";
import { resolve, type TransitionAnimation } from "./internal/animation.ts";
import { GlyphText } from "./internal/glyph-text.tsx";
import { byPlace, byTyping, digitCount, type Part } from "./internal/glyphs.ts";
import { animations, family } from "./internal/presets.ts";

export type { TransitionAnimation } from "./internal/animation.ts";

export type NumberTransitionKind =
  | "numericText"
  | "opacity"
  | "interpolate"
  | "identity"
  | "family"
  | "family-input";

export type NumberTransitionProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  value: number;
  /** Passed to `Intl.NumberFormat`. */
  format?: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
  /**
   * `numericText` is SwiftUI's `.numericText(value:)`, `opacity`,
   * `interpolate` and `identity` its other content transitions. `family` rolls
   * each digit like Family's balance, and `family-input` types digits in like
   * Family's keypad.
   */
  transition?: NumberTransitionKind;
  /**
   * Which way digits roll. Left out, they follow the value: up when it grows,
   * down when it shrinks. For `family-input`, they follow the digit count.
   */
  countsDown?: boolean;
  /** What the width, kept digits and crossfades follow. */
  animation?: TransitionAnimation;
};

type Committed = { value: number; parts: Part[]; generation: number };

export function NumberTransition({
  value,
  format,
  locales,
  transition = "numericText",
  countsDown,
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
  const parts =
    transition === "family-input"
      ? byTyping(previous?.parts ?? [], formatted, generation)
      : byPlace(formatted);

  let direction: 1 | -1 = 1;
  if (countsDown !== undefined) direction = countsDown ? -1 : 1;
  else if (previous && transition === "family-input")
    direction = digitCount(parts) < digitCount(previous.parts) ? -1 : 1;
  else if (previous) direction = value < previous.value ? -1 : 1;

  useLayoutEffect(() => {
    committed.current = { value, parts, generation };
  });

  const fallback =
    transition === "family"
      ? family.layout
      : transition === "family-input"
        ? family.input.slide
        : animations.smooth;

  return (
    <GlyphText
      {...props}
      parts={parts}
      label={formatted.map((part) => part.value).join("")}
      kind={transition}
      layout={resolve(animation, fallback)}
      direction={direction}
    />
  );
}
