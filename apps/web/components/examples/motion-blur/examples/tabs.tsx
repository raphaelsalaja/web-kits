"use client";

import { echo, motionBlur } from "@web-kits/react/motion-blur";
import { useRef } from "react";
import { clamp01, drive, spring, useScene } from "./scene";
import styles from "./tabs.module.css";
import { BEATS, loopAt } from "./timeline";

// Tabs whose pill jumps three tabs at a time on a loose spring. Only the
// pill blurs; the labels sit above it and stay sharp.

const TABS = ["Day", "Week", "Month", "Year"];
const TARGETS = [3, 1, 0];
const TAB = 72;

/** The pill's position in tabs, 0 under Day. */
const pillAt = (time: number) => {
  const at = loopAt(time);
  return BEATS.tabs.reduce(
    (pos, s, k) =>
      pos + (TARGETS[k] - (TARGETS[k - 1] ?? 0)) * spring(at - s, 18, 0.72),
    0,
  );
};

export function TabsExample() {
  const root = useRef<HTMLDivElement>(null);

  useScene(root, (el) => {
    const host = el.querySelector<HTMLElement>(`.${styles.host}`)!;
    const labels = [...el.querySelectorAll<HTMLElement>(`.${styles.tab}`)];
    const blur = motionBlur(host, { technique: echo() });
    return {
      tick(time, frame) {
        drive(
          host,
          blur,
          (s) => new DOMMatrix().translate(TAB * pillAt(s), 0),
          time,
          frame,
        );
        const pos = pillAt(time);
        labels.forEach((label, i) => {
          const off = Math.round(clamp01(Math.abs(pos - i)) * 100);
          label.style.color = `color-mix(in oklab, var(--text-primary), var(--text-tertiary) ${off}%)`;
        });
      },
      destroy: () => blur.destroy(),
    };
  });

  return (
    <div ref={root} className={styles.tabs}>
      <div className={styles.list}>
        <div className={styles.host}>
          <span className={styles.pill} />
        </div>
        {TABS.map((label) => (
          <span key={label} className={styles.tab}>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.panel}>
        <span className={styles.line} />
        <span className={styles.line} />
        <span className={styles.line} />
      </div>
    </div>
  );
}
