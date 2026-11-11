"use client";

import { echo, motionBlur } from "@web-kits/react/motion-blur";
import { useRef } from "react";
import { clamp01, drive, outCubic, spring, useScene } from "./scene";
import { BEATS, loopAt } from "./timeline";
import styles from "./toast.module.css";

// Geist's toasts, unstacked as they lay out on hover. A success toast
// springs up into the bottom of the column, the column makes room and the
// oldest fades off the top; later the new one is swiped away. Only the new
// toast blurs; the column moves slowly enough to follow.

const PITCH = 84;
const DROP = 150;
const SWIPE = 0.32;

const COLUMN = [
  { title: "New comment", description: "Sam left a note on Launch Plan." },
  { title: "Meeting moved", description: "Design review is now at 10:00." },
  { title: "Payment received", description: "Maya paid you $48.00." },
];

const riseAt = (at: number) => spring(at - BEATS.rise, 22, 0.82);

/** 0 before the new toast, 1 with it at the bottom of the column. */
const inAt = (time: number) => {
  const at = loopAt(time);
  if (at < BEATS.rise) return 0;
  if (at < BEATS.swipe) return riseAt(at);
  return 1 - spring(at - BEATS.swipe - SWIPE * 0.45, 15, 0.8);
};

const newAt = (time: number) => {
  const at = loopAt(time);
  if (at < BEATS.swipe)
    return new DOMMatrix().translate(
      0,
      (1 - (at < BEATS.rise ? 0 : riseAt(at))) * DROP,
    );
  const t = outCubic(clamp01((at - BEATS.swipe) / SWIPE));
  return new DOMMatrix().translate(440 * t, 0).rotate(4 * t);
};

export function ToastExample() {
  const root = useRef<HTMLDivElement>(null);

  useScene(
    root,
    (el) => {
      const column = el.querySelector<HTMLElement>(`.${styles.column}`)!;
      const fresh = el.querySelector<HTMLElement>(`.${styles.new}`)!;
      const oldest = column.firstElementChild as HTMLElement;
      const blur = motionBlur(fresh, { technique: echo() });
      return {
        tick(time, frame) {
          const shown = inAt(time);
          column.style.transform = `translateY(${-PITCH * shown}px)`;
          oldest.style.opacity = String(1 - shown);
          drive(fresh, blur, newAt, time, frame);
        },
        destroy: () => blur.destroy(),
      };
    },
    5.5,
  );

  return (
    <div ref={root} className={styles.toasts}>
      <div className={`${styles.host} ${styles.column}`}>
        {COLUMN.map((toast) => (
          <Toast key={toast.title} {...toast} />
        ))}
      </div>
      <div
        className={`${styles.host} ${styles.new}`}
        style={{ transform: `translateY(${DROP}px)` }}
      >
        <Toast
          success
          title="Invoice paid"
          description="Northwind paid invoice #1042."
        />
      </div>
    </div>
  );
}

function Toast({
  title,
  description,
  success,
}: {
  title: string;
  description: string;
  success?: boolean;
}) {
  return (
    <div className={styles.toast} data-success={success || undefined}>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <svg
        className={styles.close}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M4 4l8 8M12 4l-8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
