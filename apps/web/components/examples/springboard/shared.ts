"use client";

import { useInView } from "motion/react";
import { type RefObject, useEffect, useState } from "react";

export const SPEEDS = ["1×", "½×", "¼×"] as const;
export type Speed = (typeof SPEEDS)[number];

export const SPEED: Record<Speed, number> = {
  "1×": 1,
  "½×": 0.5,
  "¼×": 0.25,
};

export const TILES = [
  { id: "notes", name: "Notes", color: "var(--blue)" },
  { id: "maps", name: "Maps", color: "var(--green)" },
  { id: "photos", name: "Photos", color: "var(--orange)" },
  { id: "music", name: "Music", color: "var(--pink)" },
  { id: "mail", name: "Mail", color: "var(--purple)" },
  { id: "files", name: "Files", color: "var(--red)" },
] as const;

export type Tile = (typeof TILES)[number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * False during SSR and the hydration render, then the real setting.
 * Reading the media query in the first client render would disagree with
 * the server whenever Reduce Motion is on.
 */
export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduce;
}

export function useOnScreen(ref: RefObject<HTMLElement | null>, amount = 0.2) {
  return useInView(ref, { amount });
}

/**
 * WebKit throws if you observe `device-pixel-content-box`, and that
 * exception replaces the page. Fall back to the content box.
 */
export function observeBox(
  element: Element,
  onSize: (
    css: { width: number; height: number },
    pixels: { width: number; height: number },
  ) => void,
) {
  const apply = (entry?: ResizeObserverEntry) => {
    const rect = entry?.contentRect ?? element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    let pixelWidth = Math.max(1, Math.round(width * window.devicePixelRatio));
    let pixelHeight = Math.max(1, Math.round(height * window.devicePixelRatio));
    try {
      const box = entry?.devicePixelContentBoxSize?.[0];
      if (box && box.inlineSize > 0 && box.blockSize > 0) {
        pixelWidth = box.inlineSize;
        pixelHeight = box.blockSize;
      }
    } catch {
      // Reading the box can throw on the same WebKit builds that reject it.
    }
    onSize({ width, height }, { width: pixelWidth, height: pixelHeight });
  };

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) apply(entry);
  });

  try {
    observer.observe(element, { box: "device-pixel-content-box" });
  } catch {
    observer.observe(element);
  }

  apply();
  return () => observer.disconnect();
}
