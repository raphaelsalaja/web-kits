"use client";

import { fromPhysics, toLinear } from "@web-kits/react/animation";
import { text } from "@web-kits/react/family";
import { TextTransition } from "@web-kits/react/text-transition";
import { type CSSProperties, useEffect, useState } from "react";
import CircleCheck from "@/components/icons/fill/circle-check";
import TriangleWarning from "@/components/icons/fill/triangle-warning";
import styles from "./styles.module.css";

const { easing, duration } = toLinear(fromPhysics(4, 800, 80));

const TONES = ["analyzing", "safe", "analyzing", "warning"] as const;
type Tone = (typeof TONES)[number];

const LABELS: Record<Tone, string> = {
  analyzing: "Analyzing Transaction",
  safe: "Transaction Safe",
  warning: "Transaction Warning",
};

export function TransactionStatus() {
  const [index, setIndex] = useState(0);
  const tone = TONES[index];

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TONES.length), 1750);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.stage}>
      <div
        className={styles.status}
        data-tone={tone}
        style={
          {
            "--spring": easing,
            "--spring-duration": `${duration}ms`,
          } as CSSProperties
        }
      >
        <span className={styles.icon}>
          <svg
            aria-hidden
            data-active={tone === "analyzing"}
            className={styles.spinner}
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="9" cy="9" r="6.5" opacity={0.3} />
            <path d="M15.5 9A6.5 6.5 0 0 1 9 15.5" strokeLinecap="round" />
          </svg>
          <CircleCheck data-active={tone === "safe"} />
          <TriangleWarning
            data-active={tone === "warning"}
            className={styles.shake}
          />
        </span>
        <TextTransition transition={text}>{LABELS[tone]}</TextTransition>
      </div>
    </div>
  );
}
