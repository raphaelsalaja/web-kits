import type { Transition } from "motion/react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  motion,
  useIsPresent,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { reconcileDigitKeys } from "./reconcile";
import { isDigit, mod, splitGraphemes } from "./shared";

function DigitNum({
  n,
  current,
}: {
  n: number;
  current: ReturnType<typeof useMotionValue<number>>;
}) {
  const y = useTransform(current, (c) => {
    let offset = mod(n - c, 10);
    if (offset > 5) offset -= 10;
    const clamped = Math.max(-1, Math.min(1, offset));
    return `${-clamped * 100}%`;
  });

  return (
    <motion.span
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        x: "-50%",
        display: "inline-block",
        whiteSpace: "pre",
        y,
      }}
    >
      {n}
    </motion.span>
  );
}

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const FADE_HEIGHT = "0.25em";
const FADE_MASK = `linear-gradient(to bottom, transparent 0%, black ${FADE_HEIGHT}, black calc(100% - ${FADE_HEIGHT}), transparent 100%)`;

function SlotColumn({
  digit,
  direction,
  transition,
  delay,
  animateIn,
}: {
  digit: number;
  direction: number;
  transition: Transition;
  delay: number;
  animateIn: boolean;
}) {
  const isPresent = useIsPresent();
  const spinIn = Math.max(digit, 1);
  const startValue = animateIn ? digit - spinIn * (direction || 1) : digit;
  const current = useMotionValue(startValue);
  const cumulativeRef = useRef(digit);
  const prevDigitRef = useRef(digit);
  const initialRef = useRef(true);

  if (digit !== prevDigitRef.current) {
    const old = prevDigitRef.current;
    let diff: number;

    if (direction > 0) {
      diff = digit >= old ? digit - old : 10 - old + digit;
    } else if (direction < 0) {
      diff = old >= digit ? -(old - digit) : -(10 - digit + old);
    } else {
      diff = digit - old;
    }

    cumulativeRef.current += diff;
    prevDigitRef.current = digit;
  }

  useEffect(() => {
    if (!isPresent) {
      const spinOut = Math.max(digit, 1);
      animate(current, cumulativeRef.current + spinOut * (direction || 1), {
        ...transition,
      });
      return;
    }

    if (initialRef.current) {
      initialRef.current = false;
      if (!animateIn) return;
    }

    animate(current, cumulativeRef.current, {
      ...transition,
      delay,
    });
  });

  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        verticalAlign: "top",
      }}
    >
      <span
        style={{
          visibility: "hidden",
          whiteSpace: "pre",
          display: "inline-block",
        }}
      >
        0
      </span>
      {digits.map((n) => (
        <DigitNum key={n} n={n} current={current} />
      ))}
    </span>
  );
}

export function SlotsRenderer({
  text,
  Component,
  transition,
  stagger,
  animateInitial,
  className,
  style,
  rest,
}: {
  text: string;
  Component: React.ElementType;
  transition: Transition;
  stagger: number;
  animateInitial: boolean;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  rest: Record<string, unknown>;
}) {
  const chars = splitGraphemes(text);

  const nextIdRef = useRef(chars.length);
  const [prevText, setPrevText] = useState(text);
  const [digitKeys, setDigitKeys] = useState<number[]>(() =>
    chars.map((_, i) => i),
  );
  const dirRef = useRef(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  if (text !== prevText) {
    const result = reconcileDigitKeys(
      prevText,
      text,
      digitKeys,
      nextIdRef.current,
    );
    nextIdRef.current = result.nextId;
    dirRef.current = result.direction;
    setDigitKeys(result.keys);
    setPrevText(text);
  }

  const dir = dirRef.current;
  const prefixLen = (() => {
    const idx = chars.findIndex((c) => isDigit(c));
    return idx === -1 ? chars.length : idx;
  })();

  const digitCount = chars.filter((c) => isDigit(c)).length;
  let digitIndex = 0;

  return (
    <MotionConfig transition={transition}>
      <Component
        aria-label={text}
        style={{
          display: "inline-flex",
          position: "relative",
          ...style,
        }}
        className={className}
        {...rest}
      >
        <span
          style={{
            display: "inline-flex",
            paddingTop: FADE_HEIGHT,
            paddingBottom: FADE_HEIGHT,
            marginTop: `calc(-1 * ${FADE_HEIGHT})`,
            marginBottom: `calc(-1 * ${FADE_HEIGHT})`,
            maskImage: FADE_MASK,
            WebkitMaskImage: FADE_MASK,
          }}
        >
          <AnimatePresence mode="popLayout" initial={animateInitial}>
            {chars.map((char, i) => {
              const isPrefix = i < prefixLen;
              const outerKey = isPrefix
                ? `pre-${i}`
                : `col-${chars.length - 1 - i}`;

              if (isPrefix || !isDigit(char)) {
                return (
                  <motion.span
                    key={outerKey}
                    layout="position"
                    initial={false}
                    exit={isPrefix ? undefined : { opacity: 0 }}
                    style={{ display: "inline-block", whiteSpace: "pre" }}
                  >
                    {char}
                  </motion.span>
                );
              }

              const delay = (digitCount - 1 - digitIndex) * stagger;
              digitIndex++;

              return (
                <motion.span
                  key={outerKey}
                  layout="position"
                  initial={false}
                  exit={{ opacity: 0 }}
                  style={{ display: "inline-block" }}
                >
                  <SlotColumn
                    digit={Number(char)}
                    direction={dir}
                    transition={transition}
                    delay={delay}
                    animateIn={mountedRef.current || animateInitial}
                  />
                </motion.span>
              );
            })}
          </AnimatePresence>
        </span>
      </Component>
    </MotionConfig>
  );
}
