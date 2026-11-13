"use client";

import { echo, motionBlur } from "@web-kits/motion-blur";
import { useRef } from "react";
import styles from "./dialog.module.css";
import { Pointer } from "./pointer";
import {
  clamp01,
  drive,
  inOutCubic,
  outCubic,
  spring,
  useScene,
} from "./scene";
import { BEATS, loopAt } from "./timeline";

// The pointer clicks Delete Project and the dialog grows out of the button,
// then it clicks Cancel and the dialog shrinks back into it. The dialog
// streaks as it grows; the pointer moves slowly enough to follow.

type Point = { x: number; y: number };
const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// Points in the tile's own px. The pointer's tip is its hotspot.
const REST = { x: 300, y: 262 };
const ON_TRIGGER = { x: 216, y: 164 };
const ON_CANCEL = { x: 212, y: 206 };
const HOTSPOT = { x: 7.5, y: 5.25 };
const CLICK = 0.12;
const REACH = 0.46;
const LEAVE = 0.6;
/** The trigger's width over the dialog's: it grows out of the button. */
const FROM = 0.42;

/** 0 up, 1 at full press and back, across one click. */
const press = (at: number, t: number) =>
  Math.sin(Math.PI * clamp01((at - t) / CLICK));
const pressAt = (at: number, key: "open" | "close") =>
  Math.max(...BEATS.dialog.map((beat) => press(at, beat[key])));

const shownAt = (time: number) => {
  const at = loopAt(time);
  for (const { open, close } of BEATS.dialog) {
    if (at < open + CLICK) return 0;
    if (at < close + CLICK) return spring(at - open - CLICK, 20, 0.86);
    if (at < close + CLICK + 0.22)
      return 1 - outCubic((at - close - CLICK) / 0.22);
  }
  return 0;
};

function pointAt(at: number): Point {
  for (const { open, close } of BEATS.dialog) {
    if (at < open - REACH) return REST;
    if (at < open)
      return lerp(
        REST,
        ON_TRIGGER,
        inOutCubic(clamp01((at - open + REACH) / (REACH - 0.04))),
      );
    if (at < close - REACH) return ON_TRIGGER;
    if (at < close)
      return lerp(
        ON_TRIGGER,
        ON_CANCEL,
        inOutCubic(clamp01((at - close + REACH) / (REACH - 0.04))),
      );
    if (at < close + 0.35 + LEAVE)
      return lerp(
        ON_CANCEL,
        REST,
        inOutCubic(clamp01((at - close - 0.35) / LEAVE)),
      );
  }
  return REST;
}

const modalAt = (time: number) => {
  const o = shownAt(time);
  return new DOMMatrix().translate(0, 2 * (1 - o)).scale(FROM + (1 - FROM) * o);
};

const pointerAt = (at: number) => {
  const p = pointAt(at);
  const k = 1 - 0.1 * Math.max(pressAt(at, "open"), pressAt(at, "close"));
  return new DOMMatrix()
    .translate(p.x, p.y)
    .scale(k)
    .translate(-HOTSPOT.x, -HOTSPOT.y);
};

export function DialogExample() {
  const root = useRef<HTMLDivElement>(null);

  useScene(
    root,
    (el) => {
      const find = (name: string) =>
        el.querySelector<HTMLElement>(`.${styles[name]}`)!;
      const modal = find("host");
      const pointer = find("pointer");
      const trigger = find("trigger");
      const dim = find("dim");
      const cancel = el.querySelector<HTMLElement>("[data-cancel]")!;
      const blur = motionBlur(modal, { technique: echo() });
      return {
        tick(time, frame) {
          const at = loopAt(time);
          const shown = shownAt(time);
          drive(modal, blur, modalAt, time, frame);
          modal.style.opacity = String(clamp01(shown * 4));
          modal.style.visibility = shown > 0 ? "visible" : "hidden";
          dim.style.opacity = String(clamp01(shown));
          pointer.style.transform = pointerAt(at).toString();
          trigger.style.scale = String(1 - 0.03 * pressAt(at, "open"));
          cancel.style.scale = String(1 - 0.04 * pressAt(at, "close"));
        },
        destroy: () => blur.destroy(),
      };
    },
    3.47,
  );

  return (
    <div ref={root} className={styles.dialog}>
      <span className={styles.trigger}>Delete Project</span>
      <span className={styles.dim} style={{ opacity: 0 }} />
      <div
        className={styles.host}
        style={{
          transform: `translateY(2px) scale(${FROM})`,
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <div className={styles.modal}>
          <span className={styles.title}>Delete Project</span>
          <span className={styles.text}>
            This removes the project and its 14 deployments. You can't undo it.
          </span>
          <span className={styles.actions}>
            <span className={styles.button} data-cancel="">
              Cancel
            </span>
            <span className={styles.button} data-primary="">
              Delete
            </span>
          </span>
        </div>
      </div>
      <span
        className={styles.pointer}
        style={{
          transform: `translate(${REST.x - HOTSPOT.x}px, ${REST.y - HOTSPOT.y}px)`,
        }}
      >
        <Pointer />
      </span>
    </div>
  );
}
