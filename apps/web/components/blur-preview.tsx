"use client";

import { ProgressiveBlur } from "@web-kits/blur/react";
import styles from "./previews.module.css";

const rows = [
  ["#ff9500", 70, 48],
  ["#34c759", 56, 80],
  ["#007aff", 82, 40],
  ["#af52de", 64, 72],
  ["#ff2d55", 76, 52],
  ["#5ac8fa", 50, 66],
  ["#ffcc00", 68, 44],
  ["#5856d6", 60, 78],
] as const;

export function BlurPreview() {
  return (
    <div className={styles.blur}>
      <section
        className={styles.blurScroll}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region needs focus so the keyboard can scroll it
        tabIndex={0}
        aria-label="Inbox"
      >
        {rows.map(([color, first, second]) => (
          <div key={color} className={styles.blurRow}>
            <span className={styles.blurAvatar} style={{ background: color }} />
            <span className={styles.blurLines}>
              <span style={{ width: `${first}px` }} />
              <span style={{ width: `${second}px` }} />
            </span>
          </div>
        ))}
      </section>
      <ProgressiveBlur className={styles.blurEdge} side="top" />
      <span className={styles.blurTitle} aria-hidden="true">
        Inbox
      </span>
    </div>
  );
}
