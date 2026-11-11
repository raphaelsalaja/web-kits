"use client";

import { echo, motionBlur } from "@web-kits/react/motion-blur";
import { useRef } from "react";
import { clamp01, drive, spring, useScene } from "./scene";
import styles from "./time-machine.module.css";
import { BEATS, loopAt } from "./timeline";

// A stack of snapshots travelled back and forward. Going back, the front
// windows fly out past you, faster than the eye follows; the ones behind
// climb and shrink into the depth.

const SNAPSHOTS = [
  "Today, 9:41",
  "Today, 8:00",
  "Yesterday",
  "Oct 30",
  "Oct 28",
  "Oct 25",
  "Oct 21",
  "Oct 14",
];
const RISE = 24;
const SHRINK = 0.07;
const WIDTHS = [118, 96, 132];

/** How many snapshots back the stack has travelled. */
const travelAt = (time: number) => {
  const at = loopAt(time);
  return BEATS.travel.reduce(
    (o, { at: t, by }) => o + by * spring(at - t, 11, 0.94),
    0,
  );
};

// Past the front, a window flies toward you; behind it, each sits higher and smaller
const depthPose = (d: number) =>
  d >= 0
    ? new DOMMatrix().translate(0, -RISE * d).scale(1 - SHRINK * d)
    : new DOMMatrix().translate(0, -90 * d).scale(1 - 0.24 * d);
const depthOpacity = (d: number) =>
  d < 0 ? clamp01(1 + d * 2.6) : clamp01(3.3 - d);

export function TimeMachineExample() {
  const root = useRef<HTMLDivElement>(null);

  useScene(root, (el) => {
    const hosts = [...el.querySelectorAll<HTMLElement>(`.${styles.host}`)];
    const blurs = hosts.map((host) => motionBlur(host, { technique: echo() }));
    return {
      tick(time, frame) {
        const travelled = travelAt(time);
        hosts.forEach((host, i) => {
          drive(host, blurs[i], (s) => depthPose(i - travelAt(s)), time, frame);
          host.style.opacity = String(depthOpacity(i - travelled));
        });
      },
      destroy: () => {
        for (const blur of blurs) blur.destroy();
      },
    };
  });

  return (
    <div ref={root} className={styles.stack}>
      {SNAPSHOTS.map((title, i) => (
        <div
          key={title}
          className={styles.host}
          style={{
            transform: `translateY(${-RISE * i}px) scale(${1 - SHRINK * i})`,
            zIndex: SNAPSHOTS.length - i,
            opacity: depthOpacity(i),
          }}
        >
          <div className={styles.window}>
            <div className={styles.bar}>
              <span className={styles.dots}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.title}>{title}</span>
            </div>
            <div className={styles.body}>
              {[0, 1, 2].map((row) => (
                <span key={row} className={styles.row}>
                  <span className={styles.icon} />
                  <span
                    className={styles.line}
                    style={{ width: WIDTHS[(row + i) % 3] }}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
