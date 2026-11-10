"use client";

import {
  launch,
  type Spring,
  springboard,
  swiftui,
} from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";
import { useRef, useState } from "react";
import { Control, Controls } from "@/components/examples/controls";
import styles from "./launch.module.css";
import { COMPONENTS, type Component, Popup } from "./popups";
import { SPEED, SPEEDS, type Speed } from "./shared";

const SPRINGS = ["SpringBoard", "Snappy", "Bouncy"] as const;
type SpringName = (typeof SPRINGS)[number];

const SPRING: Record<SpringName, [Spring, Spring]> = {
  SpringBoard: [springboard.open, springboard.close],
  Snappy: [swiftui.snappy, swiftui.snappy],
  Bouncy: [swiftui.bouncy, swiftui.bouncy],
};

const NOTES = Array.from({ length: 6 }, (_, index) => index);

export function Launch() {
  const [component, setComponent] = useState<Component>("Dialog");
  const [spring, setSpring] = useState<SpringName>("SpringBoard");
  const [speed, setSpeed] = useState<Speed>("1×");
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const notes = useRef<HTMLDivElement>(null);
  const [open, close] = SPRING[spring];

  const popup = useOrigin({
    from: trigger,
    bounds: stage,
    effect: launch({ springs: { open, close }, home: notes }),
    speed: SPEED[speed],
  });

  return (
    <div>
      <div ref={stage} className={styles.stage} data-effect="launch">
        <div ref={notes} className={styles.notes} aria-hidden>
          {NOTES.map((note) => (
            <div key={note} className={styles.note}>
              <span />
              <span />
            </div>
          ))}
        </div>
        <Popup
          key={component}
          component={component}
          stage={stage}
          trigger={trigger}
          popup={popup}
          side="bottom"
        />
      </div>
      <Controls>
        <Control
          label="Component"
          options={COMPONENTS}
          value={component}
          onChange={setComponent}
        />
        <Control
          label="Spring"
          options={SPRINGS}
          value={spring}
          onChange={setSpring}
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
