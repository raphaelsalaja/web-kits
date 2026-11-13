"use client";

import { echo, motionBlur } from "@web-kits/motion-blur";
import { useRef } from "react";
import styles from "./kanban.module.css";
import { clamp01, drive, outCubic, useScene } from "./scene";
import { BEATS, loopAt } from "./timeline";

// A task thrown from To Do into Done and back. It lifts, flies across on a
// shallow arc, faster than the eye follows, and lands as the cards around it
// make room. The cards making room move slowly enough to follow and stay sharp.

const FLIGHT = 0.3;
const SHIFT = 0.36;
const LIFT = 0.15;
const ACROSS = 174;
const PITCH = 60;

function throwAt(time: number) {
  const at = loopAt(time);
  const started = BEATS.throws.filter((t) => at >= t - LIFT).length;
  if (!started) return { forward: true, fly: 0, lift: 0, across: 0, done: 0 };
  const j = started - 1;
  const t0 = BEATS.throws[j];
  const forward = j % 2 === 0;
  const fly = outCubic(clamp01((at - t0) / FLIGHT));
  const shift = outCubic(clamp01((at - t0) / SHIFT));
  const lift =
    clamp01((at - t0 + LIFT) / LIFT) - clamp01((at - t0 - FLIGHT) / LIFT);
  return {
    forward,
    fly,
    lift,
    across: forward ? fly : 1 - fly,
    // 0 with the task in To Do, 1 with it in Done
    done: forward ? shift : 1 - shift,
  };
}

const poseAt = (time: number) => {
  const { forward, fly, lift, across } = throwAt(time);
  const arc = Math.sin(Math.PI * fly);
  return new DOMMatrix()
    .translate(ACROSS * across, -30 * arc - 2 * lift)
    .rotate((forward ? 6 : -6) * arc)
    .scale(1 + 0.04 * lift);
};

export function KanbanExample() {
  const root = useRef<HTMLDivElement>(null);

  useScene(root, (el) => {
    const host = el.querySelector<HTMLElement>(`.${styles.host}`)!;
    const [todo, done] = el.querySelectorAll<HTMLElement>(`.${styles.stack}`);
    const counts = el.querySelectorAll<HTMLElement>(`.${styles.count}`);
    const blur = motionBlur(host, { technique: echo() });
    let shown = -1;
    return {
      tick(time, frame) {
        drive(host, blur, poseAt, time, frame);
        const { done: d } = throwAt(time);
        todo.style.transform = `translateY(${(1 - d) * PITCH}px)`;
        done.style.transform = `translateY(${d * PITCH}px)`;
        const landed = Math.round(d);
        if (landed === shown) return;
        shown = landed;
        counts[0].textContent = String(3 - landed);
        counts[1].textContent = String(2 + landed);
      },
      destroy: () => blur.destroy(),
    };
  });

  const column = (
    title: string,
    count: number,
    cards: number[],
    room: boolean,
  ) => (
    <div className={styles.column}>
      <div className={styles.head}>
        {title}
        <span className={styles.count}>{count}</span>
      </div>
      <div
        className={styles.stack}
        style={{ transform: `translateY(${room ? PITCH : 0}px)` }}
      >
        {cards.map((w, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <span key={i} className={styles.card}>
            <span className={styles.bar} style={{ width: w }} />
            <span className={styles.bar} data-faint style={{ width: w - 30 }} />
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={root} className={styles.board}>
      {column("To Do", 3, [96, 78, 88], true)}
      {column("Done", 2, [84, 100, 70], false)}
      <div className={styles.host}>
        <div className={styles.task}>
          <span className={styles.title}>Write the post</span>
        </div>
      </div>
    </div>
  );
}
