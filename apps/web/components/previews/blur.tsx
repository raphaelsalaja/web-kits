"use client";

import { ProgressiveBlur } from "@web-kits/blur/react";
import styles from "./styles.module.css";

const rows = [
  ["#ff9500", 120, 72],
  ["#34c759", 96, 140],
  ["#007aff", 150, 64],
  ["#af52de", 110, 128],
  ["#ff2d55", 136, 88],
  ["#5ac8fa", 84, 116],
  ["#ffcc00", 124, 76],
  ["#5856d6", 102, 136],
  ["#ff9500", 118, 70],
  ["#34c759", 92, 132],
] as const;

export function BlurPreview() {
  return (
    <div className={styles.stage}>
      <div className={styles.blur}>
        <section
          className={styles.blurScroll}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region needs focus so the keyboard can scroll it
          tabIndex={0}
          aria-label="Inbox"
        >
          {rows.map(([color, first, second]) => (
            <div key={`${color}-${first}`} className={styles.blurRow}>
              <span
                className={styles.blurAvatar}
                style={{ background: color }}
              />
              <span className={styles.blurLines}>
                <span style={{ width: first }} />
                <span style={{ width: second }} />
              </span>
            </div>
          ))}
        </section>
        <ProgressiveBlur className={styles.blurEdge} side="top" />
        <span className={styles.blurTitle} aria-hidden="true">
          Inbox
        </span>
      </div>
    </div>
  );
}
