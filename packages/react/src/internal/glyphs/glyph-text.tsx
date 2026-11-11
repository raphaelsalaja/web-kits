import {
  Component,
  type CSSProperties,
  createRef,
  type HTMLAttributes,
} from "react";
import type { Spring } from "../../animation/spring.ts";
import { opacity } from "../../content-transition/opacity.ts";
import { type Part, sameParts } from "./parts.ts";
import { timing } from "./timing.ts";
import type { ContentTransition, Plan, Seen, Update } from "./transition.ts";

export type GlyphTextProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  parts: readonly Part[];
  label: string;
  transition: ContentTransition;
  /** Moves kept glyphs and the width, and runs crossfades. */
  layout: Spring;
  /** 1 brings new glyphs in from below, -1 from above. */
  direction: 1 | -1;
};

type Snapshot = { width: number; left: number; glyphs: Map<string, Seen> };

/** How much ancestors scale the root, so client rects map back to its own pixels. */
function scaleOf(root: HTMLElement, box: DOMRect) {
  return root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
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

export class GlyphText extends Component<GlyphTextProps> {
  private root = createRef<HTMLSpanElement>();
  private overlay = createRef<HTMLSpanElement>();
  private moves: Animation[] = [];
  private interrupts: (() => void)[] = [];

  getSnapshotBeforeUpdate(previous: GlyphTextProps): Snapshot | null {
    const root = this.root.current;
    if (!root || sameParts(previous.parts, this.props.parts)) return null;
    const box = root.getBoundingClientRect();
    const k = scaleOf(root, box);
    const glyphs = new Map<string, Seen>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-glyph]")) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      glyphs.set(el.dataset.glyph as string, {
        center: (rect.left + rect.width / 2 - box.left) / k,
        width: el.offsetWidth,
        top: el.offsetTop,
        char: el.firstElementChild?.textContent ?? "",
        opacity: style.opacity,
        transform: style.transform,
        scale: style.scale,
        filter: style.filter,
      });
    }
    return { width: box.width / k, left: box.left, glyphs };
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
    for (const settle of this.interrupts) settle();
    this.interrupts = [];
  }

  private animate(previous: GlyphTextProps, snapshot: Snapshot) {
    const root = this.root.current;
    const overlay = this.overlay.current;
    if (!root || !overlay) return;
    this.stop();
    const { parts, layout, direction } = this.props;
    const transition: ContentTransition =
      this.props.transition.whole !== "swap" && reducedMotion()
        ? opacity
        : this.props.transition;
    if (transition.whole === "swap") {
      overlay.replaceChildren();
      return;
    }

    const box = root.getBoundingClientRect();
    const k = scaleOf(root, box);
    const width = box.width / k;
    const nodes = new Map<string, HTMLElement>();
    const centers = new Map<HTMLElement, number>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-glyph]")) {
      nodes.set(el.dataset.glyph as string, el);
      const rect = el.getBoundingClientRect();
      centers.set(el, (rect.left + rect.width / 2 - box.left) / k);
    }
    const before = new Map(previous.parts.map((part) => [part.key, part]));
    const after = new Set(parts.map((part) => part.key));

    // Taking the new width at once, new glyphs come in where they end up and
    // the rest slide from where they were on screen.
    const shift = (snapshot.left - box.left) / k;
    if (transition.snapWidth) {
      for (const seen of snapshot.glyphs.values()) seen.center += shift;
    } else if (Math.abs(snapshot.width - width) > 0.5) {
      this.moves.push(
        root.animate(
          { width: [`${snapshot.width}px`, `${width}px`] },
          timing(layout),
        ),
      );
    }
    // While the width animates the root's start edge moves, so glyphs that
    // come and go can be held where they are on screen against it.
    const hold = (el: HTMLElement, leaving: boolean) =>
      !transition.hold || Math.abs(shift) < 0.5
        ? []
        : [
            el.animate(
              {
                translate: leaving
                  ? ["0 0", `${shift}px 0`]
                  : [`${-shift}px 0`, "0 0"],
              },
              { ...timing(layout), fill: leaving ? "both" : "backwards" },
            ),
          ];

    if (transition.whole === "crossfade") {
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

    const update: Update = {
      previous: previous.parts,
      parts,
      after,
      seen: snapshot.glyphs,
      direction,
      layout,
      onInterrupt: (settle) => this.interrupts.push(settle),
    };
    const plan: Plan = transition.plan?.(update) ?? {};
    const enter =
      plan.enter ??
      ((el: HTMLElement, _: Part, delay: number) =>
        el.animate({ opacity: [0, 1] }, timing(layout, delay)));
    const leave =
      plan.leave ??
      ((clone: HTMLElement, _: Part, delay: number) => [
        clone.animate(
          { opacity: 0 },
          { ...timing(layout, delay), fill: "both" },
        ),
      ]);

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
            el.animate({ translate: [`${dx}px 0`, "0 0"] }, timing(layout)),
          );
        }
        if (plan.keep?.(el, part, old) || old.char === part.char) continue;
      }
      changes.push({
        x: center,
        enter: (delay) => {
          enter(el, part, delay, !seen);
          if (!seen) this.moves.push(...hold(el, false));
        },
        exit: seen
          ? (delay) =>
              this.exit(overlay, seen, (clone) =>
                leave(clone, part, delay, false),
              )
          : undefined,
      });
    }

    for (const [key, seen] of snapshot.glyphs) {
      if (after.has(key)) continue;
      const part = before.get(key);
      if (!part) continue;
      changes.push({
        x: seen.center,
        exit: (delay) =>
          this.exit(overlay, seen, (clone) => [
            ...leave(clone, part, delay, true),
            ...hold(clone, true),
          ]),
      });
    }

    changes.sort((a, b) => a.x - b.x);
    const stagger = transition.stagger ?? 0;
    changes.forEach((change, i) => {
      const delay =
        changes.length > 1 ? (stagger * i) / (changes.length - 1) : 0;
      change.exit?.(delay);
      change.enter?.(delay);
    });
  }

  private exit(
    overlay: HTMLElement,
    seen: Seen,
    run: (clone: HTMLElement) => Animation[],
  ) {
    const clone = document.createElement("span");
    const inner = document.createElement("span");
    inner.textContent = seen.char;
    clone.append(inner);
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

  render() {
    const { parts, label, transition, layout, direction, style, ...rest } =
      this.props;
    return (
      <span
        {...rest}
        ref={this.root}
        style={{ ...ROOT, ...transition.style?.(layout), ...style }}
      >
        <span style={LABEL}>{label}</span>
        <span aria-hidden="true">
          {parts.length === 0 && "\u200b"}
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
