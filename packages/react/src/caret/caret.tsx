"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { type CaretInstance, type CaretOptions, caret } from "./core.ts";

/**
 * Draws Apple's caret in the field you put the returned `ref` on: an
 * `input`, a `textarea` or a contenteditable element. Options can change on
 * any render without starting over.
 */
export function useCaret(options: CaretOptions = {}) {
  const latest = useRef(options);
  const instance = useRef<CaretInstance | null>(null);
  const { style, color, spring, reducedMotion } = options;

  useLayoutEffect(() => {
    latest.current = { style, color, spring, reducedMotion };
    instance.current?.set(latest.current);
  }, [style, color, spring, reducedMotion]);

  return useCallback((field: HTMLElement | null) => {
    if (!field) return;
    const drawn = caret(field, latest.current);
    instance.current = drawn;
    return () => {
      drawn.destroy();
      if (instance.current === drawn) instance.current = null;
    };
  }, []);
}
