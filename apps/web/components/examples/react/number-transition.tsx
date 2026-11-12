"use client";

import {
  NumberTransition,
  type NumberTransitionKind,
} from "@web-kits/react/number-transition";
import { useState } from "react";
import {
  Control,
  ControlButton,
  Controls,
} from "@/components/examples/controls";
import { ANIMATION, ANIMATIONS, type AnimationName } from "./shared";
import styles from "./styles.module.css";

const TRANSITIONS = [
  "Numeric Text",
  "Family",
  "Opacity",
  "Interpolate",
  "Identity",
] as const;
type TransitionName = (typeof TRANSITIONS)[number];

const TRANSITION: Record<TransitionName, NumberTransitionKind> = {
  "Numeric Text": "numericText",
  Family: "family",
  Opacity: "opacity",
  Interpolate: "interpolate",
  Identity: "identity",
};

const EURO = { style: "currency", currency: "EUR" } as const;

const amount = (max: number) => Math.round(Math.random() * max * 100) / 100;

export function NumberTransitionExample({
  transition: initial = "Numeric Text",
}: {
  transition?: TransitionName;
}) {
  const [value, setValue] = useState(502.75);
  const [transition, setTransition] = useState<TransitionName>(initial);
  const [animation, setAnimation] = useState<AnimationName>("Smooth");

  return (
    <div>
      <div className={styles.stage}>
        <NumberTransition
          value={value}
          format={EURO}
          locales="en-US"
          transition={TRANSITION[transition]}
          animation={transition === "Family" ? undefined : ANIMATION[animation]}
        />
      </div>
      <Controls>
        <Control
          label="Transition"
          options={TRANSITIONS}
          value={transition}
          onChange={setTransition}
        />
        <Control
          label="Animation"
          options={ANIMATIONS}
          value={animation}
          onChange={setAnimation}
        />
        <ControlButton onClick={() => setValue((v) => v + amount(500))}>
          Deposit
        </ControlButton>
        <ControlButton
          onClick={() => setValue((v) => Math.max(v - amount(v), 0))}
        >
          Spend
        </ControlButton>
      </Controls>
    </div>
  );
}
