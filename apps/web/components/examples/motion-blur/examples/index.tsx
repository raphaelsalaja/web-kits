"use client";

import { type ComponentType, useEffect, useRef } from "react";
import { DialogExample } from "./dialog";
import { DrawerExample } from "./drawer";
import { KanbanExample } from "./kanban";
import styles from "./styles.module.css";
import { TabsExample } from "./tabs";
import { TimeMachineExample } from "./time-machine";
import { ToastExample } from "./toast";

/** Every example is drawn on a canvas this wide, scaled to its tile. */
const CANVAS = 392;

const EXAMPLES: { label: string; Example: ComponentType }[] = [
  { label: "Time Machine", Example: TimeMachineExample },
  { label: "Drawer", Example: DrawerExample },
  { label: "Tabs", Example: TabsExample },
  { label: "Dialog", Example: DialogExample },
  { label: "Kanban", Example: KanbanExample },
  { label: "Toast", Example: ToastExample },
];

export function Examples() {
  const bento = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = bento.current;
    const tile = root?.firstElementChild;
    if (!root || !tile) return;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--scale", String(tile.clientWidth / CANVAS));
    });
    observer.observe(tile);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={bento}
      className={styles.bento}
      aria-label="Examples"
      data-panels
    >
      {EXAMPLES.map(({ label, Example }) => (
        <figure key={label} className={styles.tile} aria-label={label}>
          <div className={styles.canvas}>
            <Example />
          </div>
        </figure>
      ))}
    </section>
  );
}
