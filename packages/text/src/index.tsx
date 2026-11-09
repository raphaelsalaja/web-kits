"use client";

import type { Transition } from "motion/react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { NumberRenderer } from "./number";
import { type Animation, animations } from "./shared";
import { SlotsRenderer } from "./slots";
import { TextRenderer } from "./text";

export type TextProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "children"
> & {
  children?: string | number;
  variant?: "text" | "number" | "slots";
  animation?: Animation;
  as?: React.ElementType;
  drift?: { x?: number; y?: number };
  trend?: 1 | -1 | 0;
  stagger?: number;
  initial?: boolean;
  onComplete?: () => void;
  autoSize?: boolean;
};

function AutoSizeWrapper({
  children,
  transition,
}: {
  children: React.ReactNode;
  transition: Transition;
}) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.ceil(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return (
    <motion.span
      animate={{ width: width > 0 ? width : "auto" }}
      transition={transition}
      style={{ display: "inline-flex" }}
    >
      <span ref={ref} style={{ display: "inline-flex" }}>
        {children}
      </span>
    </motion.span>
  );
}

/**
 * Text — fluid text and number transitions powered by Motion.
 *
 * @param props.variant - `"text"` for LCS character diffing, `"number"` for
 * rolling vertical digits, `"slots"` for slot-machine digit spin.
 * Defaults to `"text"`.
 *
 * @param props.animation - Spring preset: `"smooth"`, `"snappy"`, or
 * `"bouncy"`. Defaults to `"smooth"` for text, `"snappy"` for number.
 *
 * @param props.as - Wrapper element type. Defaults to `"span"`.
 *
 * @param props.drift - Maximum spread in pixels for entering/exiting
 * characters. `{ x, y }` — scaled by the fraction of characters that changed.
 * Only applies to `variant="text"`. Defaults to `{ x: 15, y: 0 }`.
 *
 * @param props.trend - Vertical animation direction for entering/exiting
 * characters. `1` = enter from below, `-1` = enter from above, `0` = no
 * vertical trend. Only applies to `variant="text"`. Defaults to `0`.
 *
 * @param props.stagger - Seconds of delay spread across characters.
 * Defaults to `0.02`.
 *
 * @param props.initial - When `true`, characters animate in on first mount.
 * Defaults to `false`.
 *
 * @param props.onComplete - Fired when the last character finishes animating.
 *
 * @param props.autoSize - When `true`, the wrapper animates its width to
 * match content. Defaults to `true`.
 */
export function Text(props: TextProps) {
  const {
    children,
    variant = "text",
    animation,
    as: Component = "span",
    drift: { x: driftX = 15, y: driftY = 0 } = {},
    trend = 0,
    stagger = 0.02,
    initial: animateInitial = false,
    onComplete,
    autoSize = true,
    className,
    style,
    ...rest
  } = props;

  const transition =
    animations[animation ?? (variant === "number" ? "snappy" : "default")];

  const rendererProps = {
    text: String(children ?? ""),
    Component,
    transition,
    stagger,
    animateInitial,
    onComplete,
    className,
    style,
    rest,
  };

  let content: React.ReactNode;

  if (variant === "number") {
    content = <NumberRenderer {...rendererProps} />;
  } else if (variant === "slots") {
    content = <SlotsRenderer {...rendererProps} />;
  } else {
    content = (
      <TextRenderer
        {...rendererProps}
        driftX={driftX}
        driftY={driftY}
        trend={trend}
      />
    );
  }

  if (autoSize) {
    return <AutoSizeWrapper transition={transition}>{content}</AutoSizeWrapper>;
  }

  return content;
}
