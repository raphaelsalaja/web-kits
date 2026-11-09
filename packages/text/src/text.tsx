import type { Transition } from "motion/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";
import { reconcileTextKeys } from "./reconcile";
import { splitGraphemes } from "./shared";

export function TextRenderer({
  text,
  Component,
  transition,
  driftX,
  driftY,
  trend,
  animateInitial,
  onComplete,
  className,
  style,
  rest,
}: {
  text: string;
  Component: React.ElementType;
  transition: Transition;
  driftX: number;
  driftY: number;
  trend: number;
  stagger: number;
  animateInitial: boolean;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  rest: Record<string, unknown>;
}) {
  const graphemes = splitGraphemes(text);
  const nextIdRef = useRef(graphemes.length);
  const [prevText, setPrevText] = useState(text);
  const [charKeys, setCharKeys] = useState<string[]>(() =>
    graphemes.map((_, i) => `c${i}`),
  );
  const [changeRatio, setChangeRatio] = useState(0);

  if (text !== prevText) {
    const result = reconcileTextKeys(
      prevText,
      text,
      charKeys,
      nextIdRef.current,
    );
    nextIdRef.current = result.nextId;
    setPrevText(text);
    setCharKeys(result.keys);
    setChangeRatio(result.changeRatio);
  }

  return (
    <MotionConfig transition={transition}>
      <Component
        aria-label={text}
        style={{ display: "inline-flex", ...style }}
        className={className}
        {...rest}
      >
        <AnimatePresence mode="popLayout" initial={animateInitial}>
          {graphemes.map((char, i) => {
            const key = charKeys[i];
            const progress =
              graphemes.length <= 1 ? 0 : i / (graphemes.length - 1);
            const offsetX = (progress - 0.5) * driftX * changeRatio;
            const offsetY = (progress - 0.5) * driftY * changeRatio;
            const trendY = trend * 8 * changeRatio;
            const isLast = i === graphemes.length - 1;

            return (
              <motion.span
                key={key}
                aria-hidden="true"
                layout="position"
                initial={{
                  opacity: 0,
                  x: offsetX,
                  y: offsetY + trendY,
                  filter: "blur(4px)",
                  scale: 0.85,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                  filter: "blur(0px)",
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  x: offsetX,
                  y: offsetY - trendY,
                  filter: "blur(4px)",
                  scale: 0.85,
                }}
                onAnimationComplete={
                  isLast && onComplete ? onComplete : undefined
                }
                style={{ display: "inline-block", whiteSpace: "pre" }}
              >
                {char}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </Component>
    </MotionConfig>
  );
}
