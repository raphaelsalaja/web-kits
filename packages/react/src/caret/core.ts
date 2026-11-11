import { type Spring, solve } from "../animation/spring.ts";
import { BLINK, FOLLOW, IOS, MACOS, type Style } from "./apple.ts";

export type CaretOptions = {
  /** Whose caret and selection to draw. Defaults to `"ios"`. */
  style?: "ios" | "macos" | Style;
  /** The caret's colour, which the selection and handles are made from. Defaults to the field's `caret-color`. */
  color?: string;
  /** The spring the caret and selection move on. Defaults to `FOLLOW`. */
  spring?: Spring;
  /** `"user"` jumps instead of moving when `prefers-reduced-motion` is set. */
  reducedMotion?: "user" | "never";
};

export type CaretInstance = {
  /** Change any option without starting over. */
  set: (options: CaretOptions) => void;
  /** Remove the caret and selection and give the field its own back. */
  destroy: () => void;
};

type Box = { x: number; y: number; height: number };
type Line = { x: number; y: number; width: number; height: number };
type Shape =
  | { caret: Box }
  | { lines: Line[]; start: Box; end: Box; forward: boolean };
type Measured = { shape: Shape; clip: Line };
type Axis = { from: number; to: number; velocity: number; start: number };
type Piece = { el: HTMLDivElement; tween: Tween; leaving: boolean };
type Handle = { stick: HTMLDivElement; dot: HTMLDivElement; tween: Tween };

const STYLES = { ios: IOS, macos: MACOS };
const ATTRIBUTE = "data-web-kits-caret";
const JOINER = "\u2060";

/** Computed styles a mirror needs to lay text out the way the field does. */
const COPY = [
  "direction",
  "fontFamily",
  "fontFeatureSettings",
  "fontKerning",
  "fontSize",
  "fontStretch",
  "fontStyle",
  "fontVariant",
  "fontVariationSettings",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "overflowWrap",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "tabSize",
  "textAlign",
  "textIndent",
  "textRendering",
  "textTransform",
  "whiteSpace",
  "wordBreak",
  "wordSpacing",
] as const;

const KEYFRAMES = BLINK.offsets.map((offset, i) => ({
  offset,
  opacity: BLINK.opacity[i],
  easing: "step-end",
}));

/** A list of numbers that springs to new values, keeping its velocity when retargeted. */
class Tween {
  private axes: Axis[];

  constructor(values: number[]) {
    this.axes = [];
    this.set(values, performance.now());
  }

  set(values: number[], now: number) {
    this.axes = values.map((v) => ({
      from: v,
      to: v,
      velocity: 0,
      start: now,
    }));
  }

  to(values: number[], spring: Spring, now: number) {
    this.axes = values.map((to, i) => {
      const { position, velocity } = sample(this.axes[i], spring, now);
      return { from: position, to, velocity, start: now };
    });
  }

  at(spring: Spring, now: number) {
    return this.axes.map((a) => sample(a, spring, now).position);
  }

  done(spring: Spring, now: number) {
    return this.axes.every((a) => {
      const { position, velocity } = sample(a, spring, now);
      return Math.abs(position - a.to) < 0.01 && Math.abs(velocity) < 0.01;
    });
  }

  get target() {
    return this.axes.map((a) => a.to);
  }
}

const sample = (a: Axis, spring: Spring, now: number) =>
  a.from === a.to && a.velocity === 0
    ? { position: a.to, velocity: 0 }
    : solve(spring, (now - a.start) / 1000, a.from, a.to, a.velocity);

const textField = (
  field: HTMLElement,
): field is HTMLInputElement | HTMLTextAreaElement =>
  field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;

const part = (parent: HTMLElement) => {
  const el = document.createElement("div");
  Object.assign(el.style, { position: "absolute", top: "0", left: "0" });
  parent.append(el);
  return el;
};

const px = (value: string) => Number.parseFloat(value) || 0;

/** Rects merged into one per line, top to bottom. */
const rows = (rects: Line[]) => {
  const lines: Line[] = [];
  for (const rect of [...rects].sort((a, b) => a.y - b.y)) {
    if (!rect.height) continue;
    const middle = rect.y + rect.height / 2;
    const line = lines.find((l) => middle > l.y && middle < l.y + l.height);
    if (!line) {
      lines.push({ ...rect });
      continue;
    }
    const right = Math.max(line.x + line.width, rect.x + rect.width);
    line.x = Math.min(line.x, rect.x);
    line.width = right - line.x;
  }
  return lines;
};

/** Every line but the last runs to the far edge, and each fills its line box. */
const fit = (
  lines: Line[],
  lineHeight: number,
  left: number,
  right: number,
  rtl: boolean,
) =>
  lines.map((line, i): Line => {
    let { x, width } = line;
    if (i < lines.length - 1) {
      if (rtl) {
        width = x + width - left;
        x = left;
      } else width = right - x;
    }
    if (!lineHeight) return { ...line, x, width };
    return {
      x,
      width,
      y: line.y + line.height / 2 - lineHeight / 2,
      height: lineHeight,
    };
  });

const toLine = (r: DOMRect): Line => ({
  x: r.left,
  y: r.top,
  width: r.width,
  height: r.height,
});

const polygon = ({ x, y, width, height }: Line) =>
  `polygon(${x}px ${y}px, ${x + width}px ${y}px, ${x + width}px ${y + height}px, ${x}px ${y + height}px)`;

/** Hides the browser's selection on any element carrying the attribute. */
const hideNativeSelection = () => {
  if (document.getElementById(ATTRIBUTE)) return;
  const sheet = document.createElement("style");
  sheet.id = ATTRIBUTE;
  sheet.textContent = `[${ATTRIBUTE}]::selection,[${ATTRIBUTE}] ::selection{background-color:transparent}`;
  document.head.append(sheet);
};

/**
 * Draws Apple's caret and selection over a text input, textarea or
 * contenteditable element and hides the browser's. The caret glides between
 * positions, blinks the way iOS and macOS do and stays solid while you type.
 * A selection grows out of the caret, follows every change on the same spring
 * and folds back into it. Everything sits in an empty element placed right
 * after the field, so it scrolls and transforms with it.
 */
export function caret(
  field: HTMLElement,
  options: CaretOptions = {},
): CaretInstance {
  let style = resolve(options.style);
  let color = options.color;
  let spring = options.spring ?? FOLLOW;
  let reducedMotion = options.reducedMotion ?? "user";

  // Inputs like `email` and `number` don't say where their caret is.
  if (field instanceof HTMLInputElement && field.selectionStart === null) {
    return { set() {}, destroy() {} };
  }

  hideNativeSelection();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const own = field.style.caretColor;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    opacity: "0",
  });
  const marks = part(layer);
  const shades = part(marks);
  const wrap = part(marks);
  const bar = part(wrap);
  const grips = part(layer);
  grips.style.visibility = "hidden";
  bar.style.willChange = "transform";
  field.insertAdjacentElement("afterend", layer);

  const grip = (): Handle => {
    const stick = part(grips);
    const dot = part(grips);
    dot.style.borderRadius = "50%";
    return { stick, dot, tween: new Tween([0, 0, 0, 0]) };
  };
  const starts = grip();
  const ends = grip();

  let mirror: HTMLDivElement | null = null;
  let blink: Animation | null = null;
  let shown = false;
  let composing = false;
  let frame = 0;
  let fill = "";
  let previous: Shape | null = null;
  let pieces: Piece[] = [];
  let gripping = false;
  let letting = false;
  const point = new Tween([0, 0, 0]);

  /** The field's own caret colour, which `auto` makes its text colour. */
  const native = () => {
    field.style.caretColor = own;
    const computed = getComputedStyle(field);
    const value = computed.caretColor;
    return value === "auto" ? computed.color : value;
  };

  const paint = () => {
    const tint = color ?? native();
    const { shade, opacity } = style.highlight;
    fill = `color-mix(in srgb, color-mix(in srgb, ${tint} ${shade * 100}%, black) ${opacity * 100}%, transparent)`;
    bar.style.width = `${style.width}px`;
    bar.style.borderRadius = `${style.radius}px`;
    bar.style.background = tint;
    for (const piece of pieces) piece.el.style.background = fill;
    const { handles } = style;
    grips.style.display = handles ? "" : "none";
    if (handles) {
      for (const { stick, dot } of [starts, ends]) {
        stick.style.width = `${handles.stick}px`;
        stick.style.borderRadius = `${handles.stick / 2}px`;
        stick.style.background = tint;
        dot.style.width = `${handles.dot}px`;
        dot.style.height = `${handles.dot}px`;
        dot.style.background = tint;
      }
    }
    const fade = style.fade ? `opacity ${style.fade}s ${style.fadeEasing}` : "";
    layer.style.transition = fade;
    wrap.style.transition = fade;
    field.style.caretColor = composing ? own : "transparent";
  };

  const measureText = (
    input: HTMLInputElement | HTMLTextAreaElement,
  ): Measured | null => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === null || end === null) return null;

    const computed = getComputedStyle(input);
    if (!mirror) {
      mirror = document.createElement("div");
      mirror.setAttribute("aria-hidden", "true");
      Object.assign(mirror.style, {
        position: "fixed",
        top: "0",
        left: "0",
        visibility: "hidden",
        pointerEvents: "none",
        boxSizing: "content-box",
        border: "0",
        margin: "0",
      });
      document.body.append(mirror);
    }
    for (const key of COPY) mirror.style[key] = computed[key];
    const area = input instanceof HTMLTextAreaElement;
    if (!area) {
      mirror.style.whiteSpace = "pre";
      mirror.style.overflowWrap = "normal";
    }
    const padLeft = px(computed.paddingLeft);
    const padRight = px(computed.paddingRight);
    const padTop = px(computed.paddingTop);
    const padY = padTop + px(computed.paddingBottom);
    mirror.style.width = `${input.clientWidth - padLeft - padRight}px`;

    const text =
      input.type === "password" ? "•".repeat(input.value.length) : input.value;
    const marker = () => {
      const span = document.createElement("span");
      span.textContent = JOINER;
      return span;
    };
    const head = marker();
    const tail = marker();
    const body = document.createElement("span");
    body.textContent = text.slice(start, end);
    mirror.replaceChildren(
      text.slice(0, start),
      head,
      ...(start === end ? [] : [body, tail]),
      text.slice(end),
    );

    const rect = input.getBoundingClientRect();
    const origin = mirror.getBoundingClientRect();
    const left = rect.left + input.clientLeft;
    const top = rect.top + input.clientTop;
    const dx = left - input.scrollLeft - origin.left;
    const dy = top - input.scrollTop - origin.top;
    const y = (r: DOMRect) =>
      area
        ? r.top + dy
        : top + padTop + (input.clientHeight - padY - r.height) / 2;
    const box = (el: HTMLElement): Box => {
      const r = el.getBoundingClientRect();
      return { x: r.left + dx, y: y(r), height: r.height };
    };
    const clip = {
      x: left,
      y: top,
      width: input.clientWidth,
      height: input.clientHeight,
    };
    if (start === end) return { shape: { caret: box(head) }, clip };

    const lines = rows(
      [...body.getClientRects()].map((r) => ({
        ...toLine(r),
        x: r.left + dx,
        y: y(r),
      })),
    );
    return {
      shape: {
        lines: fit(
          lines,
          area ? px(computed.lineHeight) : 0,
          left + padLeft,
          left + input.clientWidth - padRight,
          computed.direction === "rtl",
        ),
        start: box(head),
        end: box(tail),
        forward: input.selectionDirection !== "backward",
      },
      clip,
    };
  };

  /** Where a collapsed range draws its caret. */
  const spot = (range: Range): Box | null => {
    const rect = range.getClientRects()[0];
    if (rect) return { x: rect.left, y: rect.top, height: rect.height };

    // An empty line has no rects of its own; use the node the caret is next to.
    const node = range.startContainer;
    const child =
      node.childNodes[range.startOffset] ??
      node.childNodes[range.startOffset - 1];
    const element =
      child instanceof Element
        ? child
        : node instanceof Element
          ? node
          : node.parentElement;
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const size = px(computed.fontSize);
    const line = px(computed.lineHeight) || size * 1.2;
    const height = Math.min(line, size * 1.25);
    const inset = element === child ? 0 : px(computed.paddingLeft);
    const top = element === child ? 0 : px(computed.paddingTop);
    return {
      x: box.left + inset,
      y: box.top + top + (line - height) / 2,
      height,
    };
  };

  const measureEditable = (): Measured | null => {
    const selection = getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!field.contains(range.startContainer)) return null;
    if (!field.contains(range.endContainer)) return null;

    const rect = field.getBoundingClientRect();
    const left = rect.left + field.clientLeft;
    const top = rect.top + field.clientTop;
    const clip = {
      x: left,
      y: top,
      width: field.clientWidth,
      height: field.clientHeight,
    };
    if (range.collapsed) {
      const at = spot(range);
      return at && { shape: { caret: at }, clip };
    }

    const edge = (toStart: boolean) => {
      const copy = range.cloneRange();
      copy.collapse(toStart);
      return spot(copy);
    };
    const start = edge(true);
    const end = edge(false);
    if (!start || !end) return null;

    // Blocks a range covers report their whole box, so read only text and breaks.
    const rects: Line[] = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    for (
      let node: Node | null = walker.currentNode;
      node;
      node = walker.nextNode()
    ) {
      if (!range.intersectsNode(node)) continue;
      if (node instanceof HTMLBRElement) {
        rects.push(toLine(node.getBoundingClientRect()));
      } else if (node instanceof Text) {
        const piece = document.createRange();
        piece.selectNodeContents(node);
        if (node === range.startContainer)
          piece.setStart(node, range.startOffset);
        if (node === range.endContainer) piece.setEnd(node, range.endOffset);
        for (const r of piece.getClientRects()) rects.push(toLine(r));
      }
    }

    const computed = getComputedStyle(field);
    return {
      shape: {
        lines: fit(
          rows(rects),
          px(computed.lineHeight),
          left + px(computed.paddingLeft),
          left + field.clientWidth - px(computed.paddingRight),
          computed.direction === "rtl",
        ),
        start,
        end,
        forward:
          selection.focusNode === range.endContainer &&
          selection.focusOffset === range.endOffset,
      },
      clip,
    };
  };

  /** The selection and caret from the corner of their layer, so a page scroll doesn't move them. */
  const measure = (): Measured | null => {
    const measured = textField(field) ? measureText(field) : measureEditable();
    if (!measured) return null;
    const origin = layer.getBoundingClientRect();
    const shift = <T extends Box | Line>(b: T): T => ({
      ...b,
      x: b.x - origin.left,
      y: b.y - origin.top,
    });
    const { shape, clip } = measured;
    return {
      shape:
        "caret" in shape
          ? { caret: shift(shape.caret) }
          : {
              lines: shape.lines.map(shift),
              start: shift(shape.start),
              end: shift(shape.end),
              forward: shape.forward,
            },
      clip: shift(clip),
    };
  };

  const render = (now: number) => {
    const [x, y, height] = point.at(spring, now);
    bar.style.height = `${height}px`;
    bar.style.transform = `translate(${x - style.width / 2}px, ${y}px)`;

    for (const { el, tween } of pieces) {
      const [left, top, width, tall] = tween.at(spring, now);
      el.style.transform = `translate(${left}px, ${top}px)`;
      el.style.width = `${Math.max(width, 0)}px`;
      el.style.height = `${Math.max(tall, 0)}px`;
    }

    const { handles } = style;
    if (!handles || !gripping) return;
    for (const handle of [starts, ends]) {
      const [hx, hy, tall, scale] = handle.tween.at(spring, now);
      const start = handle === starts;
      const left = start ? hx : hx - handles.stick / 2;
      const middle = left + handles.stick / 2;
      const centre = start ? hy - handles.offset : hy + tall + handles.offset;
      handle.stick.style.height = `${tall}px`;
      handle.stick.style.transform = `translate(${left}px, ${hy}px)`;
      handle.dot.style.transform = `translate(${middle - handles.dot / 2}px, ${centre - handles.dot / 2}px) scale(${Math.max(scale, 0)})`;
    }
  };

  const tick = (now: number) => {
    render(now);
    let busy = !point.done(spring, now);
    pieces = pieces.filter((piece) => {
      const done = piece.tween.done(spring, now);
      if (done && piece.leaving) {
        piece.el.remove();
        return false;
      }
      if (!done) busy = true;
      return true;
    });
    const settled =
      starts.tween.done(spring, now) && ends.tween.done(spring, now);
    if (!settled) busy = true;
    else if (letting) {
      letting = false;
      gripping = false;
      grips.style.visibility = "hidden";
    }
    frame = busy ? requestAnimationFrame(tick) : 0;
  };

  const apply = (shape: Shape, still: boolean) => {
    const now = performance.now();
    const go = (tween: Tween, to: number[]) =>
      still ? tween.set(to, now) : tween.to(to, spring, now);
    const values = (b: Box) => [b.x, b.y, b.height];
    const was = previous;
    const leave = (piece: Piece, to: Box) => {
      if (still) {
        piece.el.remove();
        pieces = pieces.filter((p) => p !== piece);
        return;
      }
      piece.leaving = true;
      piece.tween.to([to.x, to.y, 0, to.height], spring, now);
    };

    if ("caret" in shape) {
      const to = shape.caret;
      if (!still && was && "lines" in was) {
        point.set(values(was.forward ? was.end : was.start), now);
      }
      go(point, values(to));
      wrap.style.opacity = "1";
      for (const piece of pieces) if (!piece.leaving) leave(piece, to);
      if (gripping) {
        if (still) {
          gripping = false;
          grips.style.visibility = "hidden";
        } else {
          letting = true;
          for (const { tween } of [starts, ends]) go(tween, [...values(to), 0]);
        }
      }
    } else {
      wrap.style.opacity = "0";
      const from =
        still || !was
          ? null
          : "caret" in was
            ? was.caret
            : was.forward
              ? was.end
              : was.start;
      const focus = shape.forward ? shape.end : shape.start;

      const free = pieces.filter((p) => !p.leaving);
      const used = new Set<Piece>();
      for (const line of shape.lines) {
        const middle = line.y + line.height / 2;
        let match: Piece | null = null;
        let distance = line.height / 2;
        for (const piece of free) {
          if (used.has(piece)) continue;
          const [, y, , height] = piece.tween.target;
          const d = Math.abs(y + height / 2 - middle);
          if (d < distance) {
            match = piece;
            distance = d;
          }
        }
        if (!match) {
          const el = document.createElement("div");
          Object.assign(el.style, {
            position: "absolute",
            top: "0",
            left: "0",
            background: fill,
          });
          shades.append(el);
          match = {
            el,
            tween: new Tween(
              from
                ? [from.x, from.y, 0, from.height]
                : [line.x, line.y, line.width, line.height],
            ),
            leaving: false,
          };
          pieces.push(match);
        }
        used.add(match);
        go(match.tween, [line.x, line.y, line.width, line.height]);
      }
      for (const piece of free) if (!used.has(piece)) leave(piece, focus);

      if (style.handles) {
        if (!gripping) {
          starts.tween.set(
            from ? [...values(from), 0] : [...values(shape.start), 1],
            now,
          );
          ends.tween.set(
            from ? [...values(from), 0] : [...values(shape.end), 1],
            now,
          );
          gripping = true;
          grips.style.visibility = "";
        }
        letting = false;
        go(starts.tween, [...values(shape.start), 1]);
        go(ends.tween, [...values(shape.end), 1]);
      }
    }

    render(now);
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const restart = () => {
    blink?.cancel();
    blink = bar.animate(KEYFRAMES, {
      duration: BLINK.period * 1000,
      delay: style.hold * 1000,
      iterations: Number.POSITIVE_INFINITY,
      fill: "backwards",
    });
  };

  const hide = () => {
    previous = null;
    if (!shown) return;
    shown = false;
    layer.style.opacity = "0";
    field.removeAttribute(ATTRIBUTE);
    blink?.cancel();
    blink = null;
  };

  const update = (reason: "move" | "type" | "layout") => {
    const focused = field.contains(document.activeElement);
    const next = focused && !composing ? measure() : null;
    if (!next) {
      hide();
      return;
    }

    const { shape, clip } = next;
    marks.style.clipPath = polygon(clip);
    const reach = style.handles
      ? style.handles.offset + style.handles.dot / 2
      : 0;
    grips.style.clipPath = polygon({
      x: clip.x - reach,
      y: clip.y - reach,
      width: clip.width + reach * 2,
      height: clip.height + reach * 2,
    });

    const first = !shown;
    if (first) {
      paint();
      shown = true;
      field.setAttribute(ATTRIBUTE, "");
      layer.style.opacity = "1";
    }
    const changed = first || JSON.stringify(shape) !== JSON.stringify(previous);
    const still =
      first ||
      reason === "layout" ||
      (reducedMotion === "user" && reduce.matches);
    if (changed) apply(shape, still);
    if ("caret" in shape) {
      if ((changed && (first || reason !== "layout")) || reason === "type") {
        restart();
      }
    }
    previous = shape;
  };

  const move = () => update("move");
  const type = () => update("type");
  const layout = () => update("layout");
  const focus = () => {
    hide();
    requestAnimationFrame(move);
  };
  const changed = () => {
    if (field.contains(document.activeElement)) move();
  };
  const compose = (event: Event) => {
    composing = event.type === "compositionstart";
    paint();
    update("move");
  };

  const observer = new ResizeObserver(layout);
  observer.observe(field);
  document.addEventListener("selectionchange", changed);
  field.addEventListener("select", move);
  field.addEventListener("input", type);
  field.addEventListener("focusin", focus);
  field.addEventListener("focusout", hide);
  field.addEventListener("scroll", layout);
  field.addEventListener("compositionstart", compose);
  field.addEventListener("compositionend", compose);
  window.addEventListener("resize", layout);

  paint();
  if (field.contains(document.activeElement)) move();

  return {
    set(next) {
      if (next.style) style = resolve(next.style);
      if ("color" in next) color = next.color;
      if (next.spring) spring = next.spring;
      if (next.reducedMotion) reducedMotion = next.reducedMotion;
      paint();
      if (shown) {
        render(performance.now());
        if (previous && "caret" in previous) restart();
      }
    },
    destroy() {
      cancelAnimationFrame(frame);
      blink?.cancel();
      observer.disconnect();
      document.removeEventListener("selectionchange", changed);
      field.removeEventListener("select", move);
      field.removeEventListener("input", type);
      field.removeEventListener("focusin", focus);
      field.removeEventListener("focusout", hide);
      field.removeEventListener("scroll", layout);
      field.removeEventListener("compositionstart", compose);
      field.removeEventListener("compositionend", compose);
      window.removeEventListener("resize", layout);
      layer.remove();
      mirror?.remove();
      field.removeAttribute(ATTRIBUTE);
      field.style.caretColor = own;
    },
  };
}

function resolve(style: CaretOptions["style"] = "ios"): Style {
  return typeof style === "string" ? STYLES[style] : style;
}
