"use client";

import { useMotionBlur } from "@web-kits/react/motion-blur";
import { type PointerEvent, useCallback, useRef, useState } from "react";
import {
  Control,
  ControlButton,
  Controls,
} from "@/components/examples/controls";
import {
  cubicBezier,
  PEAK,
  RATES,
  SHUTTERS,
  type Shutter,
  SPEED,
  SPEEDS,
  type Speed,
  sample,
  shutterFraction,
  useFrameLoop,
  useRate,
} from "./motion";
import { Shape } from "./shape";
import {
  PAINTS,
  Streak,
  type StreakHandle,
  TECHNIQUES,
  type Technique,
} from "./streak";
import styles from "./styles.module.css";

const LAB_SHAPE = { width: 64, height: 64 };
const BALL = { width: 56, height: 56 };
const PANEL = { width: 72, height: 72 };
const INSET = 24;

const FRICTION = 2.6;
const RESTITUTION = 0.75;
const THROW_SPEED = 2800;
const SAMPLE_WINDOW = 80;

const ORBIT_RADIUS = 88;
const ORBIT_DOT = 12;
const ORBIT_TURNS = 3.5;

const SNAP_WAIT = 0.4;
const SNAP_IN = 0.22;
const SNAP_HOLD = 1;
const SNAP_OUT = 0.16;

const enterEase = cubicBezier(0.23, 1, 0.32, 1);

function bounds(stage: HTMLElement | null) {
  return {
    width: (stage?.clientWidth ?? 0) - BALL.width,
    height: (stage?.clientHeight ?? 0) - BALL.height,
  };
}

const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function Lab() {
  const stage = useRef<HTMLDivElement>(null);
  const streak = useRef<StreakHandle>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const [technique, setTechnique] = useState<Technique>("Echo");
  const [rate, setRate] = useRate();
  const [shutter, setShutter] = useState<Shutter>("180°");
  const clock = useRef({ time: 0, count: 0 });

  useFrameLoop(stage, (delta, frame) => {
    const c = clock.current;
    c.time = rate === "Still" ? PEAK : c.time + delta * SPEED[rate];

    const width = stage.current?.clientWidth ?? 0;
    const travel = Math.max(0, width - LAB_SHAPE.width - INSET * 2);
    const top = ((stage.current?.clientHeight ?? 0) - LAB_SHAPE.height) / 2;
    const [position, velocity] = sample(c.time);
    const speed = velocity * travel;
    const perFrame = speed * frame;
    const length = perFrame * shutterFraction(shutter);

    streak.current?.set(INSET + position * travel, top, length, 0);

    if (readout.current && c.count++ % 6 === 0) {
      readout.current.textContent = `${number.format(Math.abs(speed))} px/s, ${number.format(Math.abs(perFrame))} px a frame at ${Math.round(1 / frame)} Hz, ${number.format(Math.abs(length))} px streak`;
    }
  });

  return (
    <div className={styles.lab}>
      <div className={styles.body}>
        <div ref={stage} className={styles.track}>
          <Streak ref={streak} technique={technique} {...LAB_SHAPE}>
            <Shape />
          </Streak>
        </div>
        <p ref={readout} className={styles.readout} aria-live="off" />
      </div>
      <Controls>
        <Control
          label="Technique"
          options={TECHNIQUES}
          value={technique}
          onChange={setTechnique}
        />
        <Control
          label="Speed"
          options={RATES}
          value={rate}
          onChange={setRate}
        />
        <Control
          label="Shutter"
          options={SHUTTERS}
          value={shutter}
          onChange={setShutter}
        />
      </Controls>
    </div>
  );
}

export function Throw() {
  const stage = useRef<HTMLDivElement>(null);
  const streak = useRef<StreakHandle>(null);
  const [technique, setTechnique] = useState<Technique>("Echo");
  const [shutter, setShutter] = useState<Shutter>("180°");
  const [speed, setSpeed] = useState<Speed>("1×");
  const body = useRef({ x: -1, y: -1, vx: 0, vy: 0 });
  const drag = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
    samples: { t: number; x: number; y: number }[];
  } | null>(null);

  useFrameLoop(stage, (delta, frame, now) => {
    const b = body.current;
    const { width, height } = bounds(stage.current);
    if (b.x < 0) {
      b.x = width / 2;
      b.y = height / 2;
    }

    const held = drag.current;
    if (held) {
      const recent = held.samples.filter((s) => now - s.t <= SAMPLE_WINDOW);
      const first = recent[0];
      const latest = recent.at(-1);
      if (first && latest && latest.t - first.t > 0) {
        const span = (latest.t - first.t) / 1000;
        b.vx = (latest.x - first.x) / span;
        b.vy = (latest.y - first.y) / span;
      } else {
        b.vx = 0;
        b.vy = 0;
      }
    } else {
      const step = delta * SPEED[speed];
      const decay = Math.exp(-FRICTION * step);
      b.vx *= decay;
      b.vy *= decay;
      b.x += b.vx * step;
      b.y += b.vy * step;

      if (b.x < 0 || b.x > width) {
        b.x = Math.min(width, Math.max(0, b.x));
        b.vx = -b.vx * RESTITUTION;
      }
      if (b.y < 0 || b.y > height) {
        b.y = Math.min(height, Math.max(0, b.y));
        b.vy = -b.vy * RESTITUTION;
      }
      if (Math.hypot(b.vx, b.vy) < 8) {
        b.vx = 0;
        b.vy = 0;
      }
    }

    const open = frame * shutterFraction(shutter);
    streak.current?.set(b.x, b.y, b.vx * open, b.vy * open);
  });

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const down = (event: PointerEvent<HTMLDivElement>) => {
    const point = local(event);
    const b = body.current;
    const inside =
      Math.hypot(
        point.x - b.x - BALL.width / 2,
        point.y - b.y - BALL.height / 2,
      ) <=
      BALL.width / 2;
    if (!inside || drag.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      offsetX: point.x - b.x,
      offsetY: point.y - b.y,
      samples: [{ t: event.timeStamp, ...point }],
    };
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held || held.id !== event.pointerId) return;
    const point = local(event);
    const { width, height } = bounds(stage.current);
    const b = body.current;
    b.x = Math.min(width, Math.max(0, point.x - held.offsetX));
    b.y = Math.min(height, Math.max(0, point.y - held.offsetY));
    held.samples.push({ t: event.timeStamp, ...point });
    if (held.samples.length > 12) held.samples.shift();
  };

  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
  };

  const toss = () => {
    const angle = Math.random() * Math.PI * 2;
    body.current.vx = Math.cos(angle) * THROW_SPEED;
    body.current.vy = Math.sin(angle) * THROW_SPEED;
  };

  return (
    <div className={styles.lab}>
      <div className={styles.body}>
        <div
          ref={stage}
          className={styles.field}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <Streak ref={streak} technique={technique} {...BALL}>
            <div className={styles.handle}>
              <Shape kind="circle" />
            </div>
          </Streak>
        </div>
      </div>
      <Controls>
        <Control
          label="Technique"
          options={TECHNIQUES}
          value={technique}
          onChange={setTechnique}
        />
        <Control
          label="Shutter"
          options={SHUTTERS}
          value={shutter}
          onChange={setShutter}
        />
        <Control
          label="Speed"
          options={SPEEDS}
          value={speed}
          onChange={setSpeed}
        />
        <ControlButton onClick={toss}>Throw</ControlButton>
      </Controls>
    </div>
  );
}

export function Orbit() {
  const stage = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [technique, setTechnique] = useState<Technique>("Echo");
  const [shutter, setShutter] = useState<Shutter>("180°");
  const [speed, setSpeed] = useState<Speed>("1×");
  const angle = useRef(0);
  const blur = useMotionBlur({
    technique: PAINTS[technique],
    shutter: technique === "None" ? 0 : shutterFraction(shutter) * 360,
    reducedMotion: "never",
  });
  const host = useCallback(
    (node: HTMLDivElement | null) => {
      dot.current = node;
      return blur.ref(node);
    },
    [blur],
  );

  useFrameLoop(stage, (delta, frame) => {
    const omega = ORBIT_TURNS * Math.PI * 2;
    angle.current =
      (angle.current + omega * delta * SPEED[speed]) % (Math.PI * 2);

    const cx = (stage.current?.clientWidth ?? 0) / 2;
    const cy = (stage.current?.clientHeight ?? 0) / 2;
    const at = (a: number) =>
      new DOMMatrix().translate(
        cx + ORBIT_RADIUS * Math.cos(a) - ORBIT_DOT / 2,
        cy + ORBIT_RADIUS * Math.sin(a) - ORBIT_DOT / 2,
      );

    if (dot.current) dot.current.style.transform = at(angle.current).toString();
    blur.render((t) => at(angle.current + t * omega * frame));
  });

  return (
    <div className={styles.lab}>
      <div ref={stage} className={`${styles.body} ${styles.orbit}`}>
        <div
          className={styles.ring}
          style={{ width: ORBIT_RADIUS * 2, height: ORBIT_RADIUS * 2 }}
        />
        <div
          ref={host}
          className={styles.dot}
          style={{ width: ORBIT_DOT, height: ORBIT_DOT }}
        >
          <div className={styles.lens}>
            <Shape kind="circle" />
          </div>
        </div>
      </div>
      <Controls>
        <Control
          label="Technique"
          options={TECHNIQUES}
          value={technique}
          onChange={setTechnique}
        />
        <Control
          label="Shutter"
          options={SHUTTERS}
          value={shutter}
          onChange={setShutter}
        />
        <Control
          label="Speed"
          options={SPEEDS}
          value={speed}
          onChange={setSpeed}
        />
      </Controls>
    </div>
  );
}

function snap(time: number, width: number): [number, number] {
  const start = -PANEL.width - 8;
  const middle = (width - PANEL.width) / 2;
  const end = width + 8;
  const cycle = SNAP_WAIT + SNAP_IN + SNAP_HOLD + SNAP_OUT;
  const t = time % cycle;

  if (t < SNAP_WAIT) return [start, 0];
  if (t < SNAP_WAIT + SNAP_IN) {
    const u = (t - SNAP_WAIT) / SNAP_IN;
    const span = middle - start;
    return [
      start + enterEase.at(u) * span,
      (enterEase.slope(u) * span) / SNAP_IN,
    ];
  }
  if (t < SNAP_WAIT + SNAP_IN + SNAP_HOLD) return [middle, 0];
  const u = (t - SNAP_WAIT - SNAP_IN - SNAP_HOLD) / SNAP_OUT;
  const span = end - middle;
  return [
    middle + enterEase.at(u) * span,
    (enterEase.slope(u) * span) / SNAP_OUT,
  ];
}

export function Snap() {
  const stage = useRef<HTMLDivElement>(null);
  const streak = useRef<StreakHandle>(null);
  const [technique, setTechnique] = useState<Technique>("Echo");
  const [shutter, setShutter] = useState<Shutter>("180°");
  const [speed, setSpeed] = useState<Speed>("1×");
  const time = useRef(0);

  useFrameLoop(stage, (delta, frame) => {
    time.current += delta * SPEED[speed];
    const width = stage.current?.clientWidth ?? 0;
    const top = ((stage.current?.clientHeight ?? 0) - PANEL.height) / 2;
    const [x, velocity] = snap(time.current, width);
    const open = frame * shutterFraction(shutter);
    streak.current?.set(x, top, velocity * open, 0);
  });

  return (
    <div className={styles.lab}>
      <div className={styles.body}>
        <div ref={stage} className={styles.track}>
          <Streak ref={streak} technique={technique} {...PANEL}>
            <Shape />
          </Streak>
        </div>
      </div>
      <Controls>
        <Control
          label="Technique"
          options={TECHNIQUES}
          value={technique}
          onChange={setTechnique}
        />
        <Control
          label="Shutter"
          options={SHUTTERS}
          value={shutter}
          onChange={setShutter}
        />
        <Control
          label="Speed"
          options={SPEEDS}
          value={speed}
          onChange={setSpeed}
        />
      </Controls>
    </div>
  );
}
