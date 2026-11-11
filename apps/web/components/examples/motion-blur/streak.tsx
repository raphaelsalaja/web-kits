"use client";

import {
  echo,
  type Technique as Paint,
  sigmaFor,
  smear,
  squeeze,
  svg,
  useMotionBlur,
} from "@web-kits/react/motion-blur";
import {
  type ReactNode,
  type Ref,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import styles from "./styles.module.css";
export const TECHNIQUES = [
  "None",
  "Blur",
  "SVG",
  "Squeeze",
  "Echo",
  "Smear",
] as const;

export type Technique = (typeof TECHNIQUES)[number];

export type StreakHandle = {
  set: (x: number, y: number, dx: number, dy: number) => void;
};

const blur: Paint = ({ layer }) => ({
  paint({ dx, dy }) {
    layer.style.filter = `blur(${sigmaFor(Math.hypot(dx, dy)).toFixed(2)}px)`;
  },
  clear: () => layer.style.removeProperty("filter"),
});

export const PAINTS: Record<Technique, Paint> = {
  None: echo(),
  Blur: blur,
  SVG: svg(),
  Squeeze: squeeze(),
  Echo: echo(),
  Smear: smear({ limit: Number.POSITIVE_INFINITY }),
};

export function Streak({
  ref,
  technique,
  width,
  height,
  children,
}: {
  ref: Ref<StreakHandle>;
  technique: Technique;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const mover = useRef<HTMLDivElement>(null);
  const motion = useMotionBlur({
    technique: PAINTS[technique],
    shutter: 360,
    reducedMotion: "never",
  });
  const host = useCallback(
    (node: HTMLDivElement | null) => {
      mover.current = node;
      return motion.ref(node);
    },
    [motion],
  );

  useImperativeHandle(
    ref,
    () => ({
      set(x, y, dx, dy) {
        if (!mover.current) return;
        const now = new DOMMatrix().translate(x, y);
        mover.current.style.transform = now.toString();
        if (technique === "None") return motion.render(now, now);
        motion.render((t) => new DOMMatrix().translate(x + t * dx, y + t * dy));
      },
    }),
    [technique, motion],
  );

  return (
    <div ref={host} className={styles.mover} style={{ width, height }}>
      <div className={styles.lens}>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
}
