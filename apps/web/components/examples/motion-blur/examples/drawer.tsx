"use client";

import { echo, motionBlur } from "@web-kits/react/motion-blur";
import { useRef } from "react";
import styles from "./drawer.module.css";
import { clamp01, drive, outQuint, useScene } from "./scene";
import { BEATS, loopAt } from "./timeline";

// A share sheet that slides up from below, sits long enough to read and
// slides away, twice a loop. It streaks on the way up and down.

const SHEET = 275;
const OPEN = 0.5;
const CLOSE = 0.4;
const ROWS = ["Copy Link", "Messages", "Mail"];

/** 0 with the sheet below the tile, 1 with it fully up. */
const openAt = (time: number) => {
  const at = loopAt(time);
  return BEATS.drawer.reduce(
    (o, { open, close }) =>
      o +
      outQuint(clamp01((at - open) / OPEN)) -
      outQuint(clamp01((at - close) / CLOSE)),
    0,
  );
};

export function DrawerExample() {
  const root = useRef<HTMLDivElement>(null);

  useScene(
    root,
    (el) => {
      const host = el.querySelector<HTMLElement>(`.${styles.host}`)!;
      const backdrop = el.querySelector<HTMLElement>(`.${styles.backdrop}`)!;
      const blur = motionBlur(host, { technique: echo() });
      return {
        tick(time, frame) {
          drive(
            host,
            blur,
            (s) => new DOMMatrix().translate(0, SHEET * (1 - openAt(s))),
            time,
            frame,
          );
          backdrop.style.opacity = String(openAt(time));
        },
        destroy: () => blur.destroy(),
      };
    },
    3.6,
  );

  return (
    <div ref={root} className={styles.drawer}>
      <span className={styles.trigger}>Share</span>
      <span className={styles.backdrop} style={{ opacity: 0 }} />
      <div
        className={styles.host}
        style={{ transform: `translateY(${SHEET}px)` }}
      >
        <div className={styles.sheet}>
          <span className={styles.handle} />
          <span className={styles.title}>Share</span>
          <span className={styles.text}>Anyone with the link can view.</span>
          <div className={styles.rows}>
            {ROWS.map((row) => (
              <span key={row} className={styles.row}>
                {row}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
