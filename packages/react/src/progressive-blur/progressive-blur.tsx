"use client";

import { type ComponentProps, useLayoutEffect, useRef } from "react";
import {
  type ProgressiveBlurInstance as Instance,
  type ProgressiveBlurOptions,
  progressiveBlur,
} from "./core.ts";

export type ProgressiveBlurProps = ProgressiveBlurOptions &
  Omit<ComponentProps<"div">, "children" | "color">;

/**
 * An empty `div` that draws Apple's progressive blur over whatever is behind
 * it. Give it a size and a position, like a fixed strip under a header.
 */
export function ProgressiveBlur({
  side,
  color,
  scheme,
  start,
  end,
  technique,
  ...props
}: ProgressiveBlurProps) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Instance | null>(null);

  useLayoutEffect(() => {
    const options = { side, color, scheme, start, end, technique };
    if (instance.current) instance.current.set(options);
    else if (host.current)
      instance.current = progressiveBlur(host.current, options);
  }, [side, color, scheme, start, end, technique]);

  useLayoutEffect(
    () => () => {
      instance.current?.destroy();
      instance.current = null;
    },
    [],
  );

  return <div aria-hidden {...props} ref={host} />;
}
