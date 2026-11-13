"use client";

import { Menu } from "@base-ui/react/menu";
import { morph } from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";
import { type CSSProperties, useRef, useState } from "react";
import { Control, Controls } from "@/components/examples/controls";
import styles from "./glass-menu.module.css";
import { Bag, Camera, Check, Microphone, Plus } from "./icons";
import { SPEED, SPEEDS, type Speed } from "./shared";

export const ACTIONS = [
  {
    label: "Camera",
    Icon: Camera,
    tint: "var(--gray-12)",
    ink: "var(--gray-1)",
  },
  { label: "Store", Icon: Bag, tint: "var(--blue)", ink: "var(--white)" },
  { label: "Audio", Icon: Microphone, tint: "var(--red)", ink: "var(--white)" },
  {
    label: "Check In",
    Icon: Check,
    tint: "var(--orange)",
    ink: "var(--white)",
  },
] as const;

const effect = morph();

/** How far the open menu reaches past the button's bottom and right edges. */
const OVERLAP = 12;

export function GlassMenu() {
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [speed, setSpeed] = useState<Speed>("1×");
  const popup = useOrigin({
    from: trigger,
    bounds: stage,
    effect,
    speed: SPEED[speed],
  });

  return (
    <div>
      <div ref={stage} className={styles.stage}>
        <Menu.Root modal={false}>
          <Menu.Trigger
            ref={trigger}
            className={styles.button}
            aria-label="New"
          >
            <Plus />
          </Menu.Trigger>
          <Menu.Portal container={stage}>
            <Menu.Positioner
              side="top"
              align="end"
              sideOffset={-OVERLAP - 46}
              alignOffset={-OVERLAP}
            >
              <Menu.Popup ref={popup} className={styles.menu}>
                {ACTIONS.map(({ label, Icon, tint, ink }) => (
                  <Menu.Item
                    key={label}
                    className={styles.item}
                    style={{ "--tint": tint, "--ink": ink } as CSSProperties}
                  >
                    <span className={styles.icon}>
                      <Icon />
                    </span>
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <Controls>
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
