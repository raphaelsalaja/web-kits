"use client";

import {
  identity,
  interpolate,
  numericText,
  opacity,
  type TextContentTransition,
} from "@web-kits/react/content-transition";
import { text } from "@web-kits/react/family";
import { TextTransition } from "@web-kits/react/text-transition";
import { useState } from "react";
import {
  Control,
  ControlButton,
  Controls,
} from "@/components/examples/controls";
import { ANIMATION, ANIMATIONS, type AnimationName } from "./shared";
import styles from "./styles.module.css";

const TRANSITIONS = [
  "Family",
  "Opacity",
  "Interpolate",
  "Numeric Text",
  "Identity",
] as const;
type TransitionName = (typeof TRANSITIONS)[number];

const TRANSITION: Record<TransitionName, TextContentTransition> = {
  Family: text,
  Opacity: opacity,
  Interpolate: interpolate,
  "Numeric Text": numericText(),
  Identity: identity,
};

const LABELS = [
  "Still not enough ETH",
  "Not enough ETH",
  "Review",
  "Craft",
  "Creative",
];

export function TextTransitionExample({
  transition: initial = "Family",
}: {
  transition?: TransitionName;
}) {
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<TransitionName>(initial);
  const [animation, setAnimation] = useState<AnimationName>("Smooth");

  return (
    <div>
      <div className={`${styles.stage} ${styles.text}`}>
        <TextTransition
          transition={TRANSITION[transition]}
          animation={transition === "Family" ? undefined : ANIMATION[animation]}
        >
          {LABELS[index]}
        </TextTransition>
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
        <ControlButton onClick={() => setIndex((i) => (i + 1) % LABELS.length)}>
          Next
        </ControlButton>
      </Controls>
    </div>
  );
}
