"use client";

import { motion } from "motion/react";
import { useId } from "react";
import styles from "./segmented.module.css";

const spring = { type: "spring", bounce: 0.18, duration: 0.4 } as const;

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and legend layout
    <div className={styles.control} role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            className={styles.option}
            onClick={() => onChange(option)}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-pill`}
                className={styles.pill}
                transition={spring}
              />
            )}
            <span className={styles.label}>{option}</span>
          </button>
        );
      })}
    </div>
  );
}
