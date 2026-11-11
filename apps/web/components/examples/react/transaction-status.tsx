"use client";

import { fromPhysics, toLinear, toMotion } from "@web-kits/react/springs";
import { MotionConfig, motion } from "motion/react";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import CircleCheck from "@/components/icons/fill/circle-check";
import TriangleWarning from "@/components/icons/fill/triangle-warning";
import styles from "./styles.module.css";

const SPRING = fromPhysics(4, 800, 80);
const MOTION = toMotion(SPRING);
const { easing, duration } = toLinear(SPRING);

const TONES = ["analyzing", "safe", "analyzing", "warning"] as const;
type Tone = (typeof TONES)[number];

const LABELS: Record<Tone, string> = {
  analyzing: "Analyzing Transaction",
  safe: "Transaction Safe",
  warning: "Transaction Warning",
};

/** Words that leave go at once, and words that arrive wait for them. */
const fade = (shown: boolean) => ({
  duration: 0.1,
  ease: "linear" as const,
  delay: shown ? 0.1 : 0,
});

export function TransactionStatus() {
  const [index, setIndex] = useState(0);
  const tone = TONES[index];
  const analyzing = useRef<HTMLSpanElement>(null);
  const transaction = useRef<HTMLSpanElement>(null);
  const safe = useRef<HTMLSpanElement>(null);
  const warning = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{
    shift: number;
    width: Record<Tone, number>;
  }>();

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TONES.length), 1750);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const a = analyzing.current;
      const t = transaction.current;
      const s = safe.current;
      const w = warning.current;
      if (!a || !t || !s || !w) return;
      const end = (el: HTMLElement) => el.offsetLeft + el.offsetWidth;
      setSize({
        shift: t.offsetLeft - a.offsetLeft,
        width: {
          analyzing: end(t) - a.offsetLeft,
          safe: end(s) - t.offsetLeft,
          warning: end(w) - t.offsetLeft,
        },
      });
    };
    measure();
    document.fonts.ready.then(measure);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
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
          <span className={styles.label}>{LABELS[tone]}</span>
          <motion.span
            aria-hidden
            className={styles.window}
            initial={false}
            animate={size && { width: size.width[tone] }}
            transition={MOTION}
          >
            <motion.span
              className={styles.track}
              initial={false}
              animate={{ x: tone === "analyzing" || !size ? 0 : -size.shift }}
              transition={MOTION}
            >
              <motion.span
                ref={analyzing}
                initial={false}
                animate={{ opacity: tone === "analyzing" ? 1 : 0 }}
                transition={fade(tone === "analyzing")}
              >
                Analyzing
              </motion.span>
              <span ref={transaction}>Transaction</span>
              <span className={styles.outcome}>
                <motion.span
                  ref={safe}
                  initial={false}
                  animate={{ opacity: tone === "safe" ? 1 : 0 }}
                  transition={fade(tone === "safe")}
                >
                  Safe
                </motion.span>
                <motion.span
                  ref={warning}
                  initial={false}
                  animate={{ opacity: tone === "warning" ? 1 : 0 }}
                  transition={fade(tone === "warning")}
                >
                  Warning
                </motion.span>
              </span>
            </motion.span>
          </motion.span>
        </div>
      </div>
    </MotionConfig>
  );
}
