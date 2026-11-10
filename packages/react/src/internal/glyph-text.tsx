import {
  Component,
  type CSSProperties,
  createRef,
  type HTMLAttributes,
} from "react";
import { type Spring, settle, toLinear, value } from "../springs.ts";
import { type Part, sameParts } from "./glyphs.ts";
import { family, numericText } from "./presets.ts";

export type Kind =
  | "identity"
  | "opacity"
  | "interpolate"
  | "numericText"
  | "family"
  | "family-input";

export type GlyphTextProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  parts: readonly Part[];
  label: string;
  kind: Kind;
  /** Moves kept glyphs and the width, and runs crossfades. */
  layout: Spring;
  /** 1 brings new glyphs in from below, -1 from above. */
  direction: 1 | -1;
};

type Seen = {
  center: number;
  width: number;
  top: number;
  char: string;
  opacity: string;
  transform: string;
  scale: string;
  filter: string;
};

type Snapshot = { width: number; left: number; glyphs: Map<string, Seen> };

const curves = new WeakMap<Spring, { easing: string; duration: number }>();

function curve(spring: Spring) {
  let found = curves.get(spring);
  if (!found) {
    found = toLinear(spring);
    curves.set(spring, found);
  }
  return found;
}

function timing(spring: Spring, delay = 0): KeyframeAnimationOptions {
  return { ...curve(spring), delay: delay * 1000, fill: "backwards" };
}

/** A spring run `gain` times as far, held at the end once it gets there. */
function overshot(spring: Spring, gain: number, delay: number) {
  const duration = settle(spring);
  const points = Array.from({ length: 61 }, (_, i) =>
    Number(Math.min(gain * value(spring, (i / 60) * duration), 1).toFixed(4)),
  );
  return {
    easing: `linear(${points.join(", ")})`,
    duration: Math.round(duration * 1000),
    delay: delay * 1000,
    fill: "both" as const,
  };
}

const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const ROOT: CSSProperties = {
  display: "inline-block",
  position: "relative",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  textAlign: "start",
};

const WINDOW =
  "linear-gradient(to bottom, transparent, #000 0.3em, #000 calc(100% - 0.2em), transparent)";

const INPUT: CSSProperties = {
  paddingBlock: "0.3em 0.2em",
  marginBlock: "-0.3em -0.2em",
  maskImage: WINDOW,
  WebkitMaskImage: WINDOW,
};

const LABEL: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

const GLYPH: CSSProperties = {
  display: "inline-block",
  position: "relative",
  whiteSpace: "pre",
};

const OVERLAY: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const INTERPOLATED = [
  "color",
  "font-size",
  "font-weight",
  "font-variation-settings",
  "letter-spacing",
];

export class GlyphText extends Component<GlyphTextProps> {
  private root = createRef<HTMLSpanElement>();
  private overlay = createRef<HTMLSpanElement>();
  private moves: Animation[] = [];
  private rolls = new Map<HTMLElement, () => void>();

  getSnapshotBeforeUpdate(previous: GlyphTextProps): Snapshot | null {
    const root = this.root.current;
    if (!root || sameParts(previous.parts, this.props.parts)) return null;
    const box = root.getBoundingClientRect();
    const glyphs = new Map<string, Seen>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-glyph]")) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      glyphs.set(el.dataset.glyph as string, {
        center: rect.left + rect.width / 2 - box.left,
        width: el.offsetWidth,
        top: el.offsetTop,
        char: el.firstElementChild?.textContent ?? "",
        opacity: style.opacity,
        transform: style.transform,
        scale: style.scale,
        filter: style.filter,
      });
    }
    return { width: box.width, left: box.left, glyphs };
  }

  componentDidUpdate(
    previous: GlyphTextProps,
    _: unknown,
    snapshot: Snapshot | null,
  ) {
    if (snapshot) this.animate(previous, snapshot);
  }

  componentWillUnmount() {
    this.stop();
  }

  private stop() {
    for (const animation of this.moves) animation.cancel();
    this.moves = [];
    for (const settle of this.rolls.values()) settle();
    this.rolls.clear();
  }

  private animate(previous: GlyphTextProps, snapshot: Snapshot) {
    const root = this.root.current;
    const overlay = this.overlay.current;
    if (!root || !overlay) return;
    this.stop();
    const { parts, layout } = this.props;
    const kind =
      this.props.kind !== "identity" && reducedMotion()
        ? "opacity"
        : this.props.kind;
    if (kind === "identity") {
      overlay.replaceChildren();
      return;
    }

    const box = root.getBoundingClientRect();
    const nodes = new Map<string, HTMLElement>();
    const centers = new Map<HTMLElement, number>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-glyph]")) {
      nodes.set(el.dataset.glyph as string, el);
      const rect = el.getBoundingClientRect();
      centers.set(el, rect.left + rect.width / 2 - box.left);
    }
    const before = new Map(previous.parts.map((part) => [part.key, part]));
    const after = new Set(parts.map((part) => part.key));
    const slide = kind === "family-input" ? family.input.slide : layout;
    const crossfade = kind === "opacity" || kind === "interpolate";

    if (Math.abs(snapshot.width - box.width) > 0.5) {
      this.moves.push(
        root.animate(
          { width: [`${snapshot.width}px`, `${box.width}px`] },
          timing(slide),
        ),
      );
    }

    if (crossfade) {
      for (const seen of snapshot.glyphs.values()) {
        this.exit(overlay, seen, (clone) => [
          clone.animate({ opacity: 0 }, { ...timing(layout), fill: "both" }),
        ]);
      }
      for (const el of nodes.values()) {
        el.animate({ opacity: [0, 1] }, timing(layout));
      }
      return;
    }

    type Change = {
      x: number;
      enter?: (delay: number) => void;
      exit?: (delay: number) => void;
    };
    const changes: Change[] = [];

    for (const part of parts) {
      const el = nodes.get(part.key);
      if (!el) continue;
      const seen = snapshot.glyphs.get(part.key);
      const old = before.get(part.key);
      const center = centers.get(el) ?? 0;

      if (seen && old) {
        const dx = seen.center - center;
        if (Math.abs(dx) > 0.5) {
          this.moves.push(
            el.animate({ translate: [`${dx}px 0`, "0 0"] }, timing(slide)),
          );
        }
        if (old.char === part.char) continue;
        if (
          kind === "family" &&
          old.role === "digit" &&
          part.role === "digit"
        ) {
          this.roll(el, old.char, part.char);
          continue;
        }
      }
      changes.push({
        x: center,
        enter: (delay) => this.enter(el, part, kind, delay),
        exit: seen
          ? (delay) => this.leave(overlay, seen, part, kind, delay)
          : undefined,
      });
    }

    for (const [key, seen] of snapshot.glyphs) {
      if (after.has(key)) continue;
      const part = before.get(key);
      if (!part) continue;
      changes.push({
        x: seen.center,
        exit: (delay) => this.leave(overlay, seen, part, kind, delay),
      });
    }

    changes.sort((a, b) => a.x - b.x);
    const stagger = kind === "numericText" && changes.length > 1;
    changes.forEach((change, i) => {
      const delay = stagger
        ? (numericText.stagger * i) / (changes.length - 1)
        : 0;
      change.exit?.(delay);
      change.enter?.(delay);
    });
  }

  private enter(el: HTMLElement, part: Part, kind: Kind, delay: number) {
    const { direction } = this.props;
    if (kind === "numericText") {
      el.animate(
        {
          transform: [
            `translateY(${direction * numericText.offset}em)`,
            "none",
          ],
        },
        timing(numericText.move, delay),
      );
      el.animate(
        {
          opacity: [0, 1],
          scale: [String(numericText.scale), "1"],
          filter: [`blur(${numericText.blur}em)`, "blur(0)"],
        },
        timing(numericText.fade, delay),
      );
    } else if (kind === "family-input") {
      const from = part.role === "digit" ? direction : 1;
      el.animate(
        {
          transform: [
            `translateY(${from * family.input.enterOffset}cap)`,
            "none",
          ],
        },
        timing(family.input.enter, delay),
      );
    } else {
      el.animate({ opacity: [0, 1] }, timing(this.props.layout, delay));
    }
  }

  private leave(
    overlay: HTMLElement,
    seen: Seen,
    part: Part,
    kind: Kind,
    delay: number,
  ) {
    const { direction, layout } = this.props;
    this.exit(overlay, seen, (clone) => {
      if (kind === "numericText") {
        return [
          clone.animate(
            { transform: `translateY(${-direction * numericText.offset}em)` },
            { ...timing(numericText.move, delay), fill: "both" },
          ),
          clone.animate(
            {
              scale: String(numericText.scale),
              filter: `blur(${numericText.blur}em)`,
            },
            { ...timing(numericText.fade, delay), fill: "both" },
          ),
          clone.animate(
            { opacity: 0 },
            overshot(numericText.fade, numericText.fadeOut, delay),
          ),
        ];
      }
      if (kind === "family-input") {
        const to = part.role === "digit" ? -direction : 1;
        return [
          clone.animate(
            { transform: `translateY(${to * family.input.exitOffset}cap)` },
            { ...timing(family.input.exit, delay), fill: "both" },
          ),
        ];
      }
      return [
        clone.animate(
          { opacity: 0 },
          { ...timing(layout, delay), fill: "both" },
        ),
      ];
    });
  }

  private exit(
    overlay: HTMLElement,
    seen: Seen,
    run: (clone: HTMLElement) => Animation[],
  ) {
    const clone = document.createElement("span");
    clone.textContent = seen.char;
    Object.assign(clone.style, {
      position: "absolute",
      left: `${seen.center - seen.width / 2}px`,
      top: `${seen.top}px`,
      display: "inline-block",
      whiteSpace: "pre",
      opacity: seen.opacity,
      transform: seen.transform,
      scale: seen.scale,
      filter: seen.filter,
    });
    overlay.append(clone);
    const animations = run(clone);
    Promise.allSettled(animations.map((a) => a.finished)).then(() =>
      clone.remove(),
    );
  }

  private roll(el: HTMLElement, from: string, to: string) {
    const { direction } = this.props;
    const a = Number(from);
    const b = Number(to);
    if (Number.isNaN(a) || Number.isNaN(b)) return;
    const steps = (direction * (b - a) + 10) % 10;
    if (!steps) return;
    const digits = Array.from({ length: steps + 1 }, (_, i) =>
      String((a + direction * i + 10) % 10),
    );
    if (direction < 0) digits.reverse();

    const inner = el.firstElementChild as HTMLElement;
    const height = el.offsetHeight;
    const strip = document.createElement("span");
    Object.assign(strip.style, {
      position: "absolute",
      insetInline: "0",
      top: "0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    });
    for (const digit of digits) {
      const cell = document.createElement("span");
      cell.textContent = digit;
      cell.style.height = `${height}px`;
      strip.append(cell);
    }
    const edge =
      "linear-gradient(to bottom, transparent, #000 15%, #000 85%, transparent)";
    Object.assign(el.style, {
      paddingInline: "0.15em",
      marginInline: "-0.15em",
      maskImage: edge,
      webkitMaskImage: edge,
    });
    inner.style.opacity = "0";
    el.append(strip);

    const travel = steps * height;
    const animation = strip.animate(
      {
        transform:
          direction > 0
            ? ["translateY(0)", `translateY(${-travel}px)`]
            : [`translateY(${-travel}px)`, "translateY(0)"],
      },
      { ...timing(family.wheel), fill: "both" },
    );
    const settle = () => {
      animation.cancel();
      strip.remove();
      inner.style.opacity = "";
      Object.assign(el.style, {
        paddingInline: "",
        marginInline: "",
        maskImage: "",
        webkitMaskImage: "",
      });
      this.rolls.delete(el);
    };
    this.rolls.set(el, settle);
    animation.finished.then(settle, () => {});
  }

  render() {
    const { parts, label, kind, layout, direction, style, ...rest } =
      this.props;
    const interpolated: CSSProperties | undefined =
      kind === "interpolate"
        ? {
            transitionProperty: INTERPOLATED.join(", "),
            transitionDuration: `${curve(layout).duration}ms`,
            transitionTimingFunction: curve(layout).easing,
          }
        : undefined;
    return (
      <span
        {...rest}
        ref={this.root}
        style={{
          ...ROOT,
          ...(kind === "family-input" ? INPUT : undefined),
          ...interpolated,
          ...style,
        }}
      >
        <span style={LABEL}>{label}</span>
        <span aria-hidden="true">
          {parts.map((part) => (
            <span key={part.key} data-glyph={part.key} style={GLYPH}>
              <span>{part.char}</span>
            </span>
          ))}
        </span>
        <span aria-hidden="true" ref={this.overlay} style={OVERLAY} />
      </span>
    );
  }
}
