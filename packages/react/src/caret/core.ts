import { type Spring, solve } from "../animation/spring.ts";
import { BLINK, FOLLOW, IOS, MACOS, type Style } from "./apple.ts";

export type CaretOptions = {
  /** Whose caret to draw. Defaults to `"ios"`. */
  style?: "ios" | "macos" | Style;
  /** The bar's colour. Defaults to the field's `caret-color`. */
  color?: string;
  /** The spring the caret glides on between positions. Defaults to `FOLLOW`. */
  spring?: Spring;
  /** `"user"` jumps instead of gliding when `prefers-reduced-motion` is set. */
  reducedMotion?: "user" | "never";
};

export type CaretInstance = {
  /** Change any option without starting over. */
  set: (options: CaretOptions) => void;
  /** Remove the caret and give the field its own back. */
  destroy: () => void;
};

type Box = { x: number; y: number; height: number };
type Axis = { from: number; to: number; velocity: number; start: number };

const STYLES = { ios: IOS, macos: MACOS };

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

const textField = (
  field: HTMLElement,
): field is HTMLInputElement | HTMLTextAreaElement =>
  field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;

const settled = (a: Axis, now: number, s: Spring) => {
  const { position, velocity } = solve(
    s,
    (now - a.start) / 1000,
    a.from,
    a.to,
    a.velocity,
  );
  return Math.abs(position - a.to) < 0.01 && Math.abs(velocity) < 0.01;
};

/**
 * Draws Apple's caret over a text input, textarea or contenteditable element
 * and hides the browser's. It glides between positions, blinks the way iOS
 * and macOS do and stays solid while you type. The bar sits in an empty
 * element placed right after the field, so it scrolls and transforms with it.
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
  const bar = document.createElement("div");
  Object.assign(bar.style, {
    position: "absolute",
    top: "0",
    left: "0",
    willChange: "transform",
  });
  layer.append(bar);
  field.insertAdjacentElement("afterend", layer);

  let mirror: HTMLDivElement | null = null;
  let blink: Animation | null = null;
  let shown = false;
  let composing = false;
  let frame = 0;
  let axes: Record<keyof Box, Axis> | null = null;
  let last: Box | null = null;

  /** The field's own caret colour, which `auto` makes its text colour. */
  const native = () => {
    field.style.caretColor = own;
    const computed = getComputedStyle(field);
    const value = computed.caretColor;
    return value === "auto" ? computed.color : value;
  };

  const paint = () => {
    bar.style.width = `${style.width}px`;
    bar.style.borderRadius = `${style.radius}px`;
    bar.style.background = color ?? native();
    layer.style.transition = style.fade
      ? `opacity ${style.fade}s ${style.fadeEasing}`
      : "";
    field.style.caretColor = composing ? own : "transparent";
  };

  const measureText = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const start = input.selectionStart;
    if (start === null) return null;
    if (start !== input.selectionEnd) return "range";

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
    const padX =
      Number.parseFloat(computed.paddingLeft) +
      Number.parseFloat(computed.paddingRight);
    const padY =
      Number.parseFloat(computed.paddingTop) +
      Number.parseFloat(computed.paddingBottom);
    mirror.style.width = `${input.clientWidth - padX}px`;

    const text =
      input.type === "password" ? "•".repeat(input.value.length) : input.value;
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.replaceChildren(
      text.slice(0, start),
      marker,
      text.slice(start) || "",
    );

    const rect = input.getBoundingClientRect();
    const height = marker.offsetHeight;
    const x =
      rect.left + input.clientLeft + marker.offsetLeft - input.scrollLeft;
    const y = area
      ? rect.top + input.clientTop + marker.offsetTop - input.scrollTop
      : rect.top +
        input.clientTop +
        Number.parseFloat(computed.paddingTop) +
        (input.clientHeight - padY - height) / 2;

    const left = rect.left + input.clientLeft;
    const top = rect.top + input.clientTop;
    const outside =
      x < left - 1 ||
      x > left + input.clientWidth + 1 ||
      y + height < top ||
      y > top + input.clientHeight;
    return outside ? null : { x, y, height };
  };

  const measureEditable = () => {
    const selection = getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!field.contains(range.startContainer)) return null;
    if (!range.collapsed) return "range";

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
    const size = Number.parseFloat(computed.fontSize);
    const line = Number.parseFloat(computed.lineHeight) || size * 1.2;
    const height = Math.min(line, size * 1.25);
    const inset =
      element === child ? 0 : Number.parseFloat(computed.paddingLeft);
    const top = element === child ? 0 : Number.parseFloat(computed.paddingTop);
    return {
      x: box.left + inset,
      y: box.top + top + (line - height) / 2,
      height,
    };
  };

  /** Where the caret goes, from the corner of its layer so a page scroll doesn't move it. */
  const measure = (): Box | "range" | null => {
    const box = textField(field) ? measureText(field) : measureEditable();
    if (!box || box === "range") return box;
    const origin = layer.getBoundingClientRect();
    return {
      x: box.x - origin.left,
      y: box.y - origin.top,
      height: box.height,
    };
  };

  const place = ({ x, y, height }: Box) => {
    bar.style.height = `${height}px`;
    bar.style.transform = `translate(${x - style.width / 2}px, ${y}px)`;
  };

  const tick = (now: number) => {
    if (!axes) return;
    const at = (key: keyof Box) => {
      const a = (axes as Record<keyof Box, Axis>)[key];
      return solve(spring, (now - a.start) / 1000, a.from, a.to, a.velocity)
        .position;
    };
    place({ x: at("x"), y: at("y"), height: at("height") });
    const done = (["x", "y", "height"] as const).every((key) =>
      settled((axes as Record<keyof Box, Axis>)[key], now, spring),
    );
    if (done) {
      axes = null;
      frame = 0;
      if (last) place(last);
    } else frame = requestAnimationFrame(tick);
  };

  const glide = (to: Box) => {
    const now = performance.now();
    const next = {} as Record<keyof Box, Axis>;
    for (const key of ["x", "y", "height"] as const) {
      const a = axes?.[key];
      const current = a
        ? solve(spring, (now - a.start) / 1000, a.from, a.to, a.velocity)
        : { position: last?.[key] ?? to[key], velocity: 0 };
      next[key] = {
        from: current.position,
        to: to[key],
        velocity: current.velocity,
        start: now,
      };
    }
    axes = next;
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const jump = (to: Box) => {
    cancelAnimationFrame(frame);
    frame = 0;
    axes = null;
    place(to);
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
    if (!shown) return;
    shown = false;
    layer.style.opacity = "0";
    blink?.cancel();
    blink = null;
  };

  const update = (reason: "move" | "type" | "layout") => {
    const focused = field.contains(document.activeElement);
    const next = focused && !composing ? measure() : null;
    if (!next || next === "range") {
      last = null;
      hide();
      return;
    }

    const moved =
      !last ||
      next.x !== last.x ||
      next.y !== last.y ||
      next.height !== last.height;
    const still = reducedMotion === "user" && reduce.matches;

    if (!shown) {
      paint();
      jump(next);
      shown = true;
      layer.style.opacity = "1";
      restart();
    } else if (moved) {
      if (reason === "layout" || still) jump(next);
      else glide(next);
      if (reason !== "layout") restart();
    } else if (reason === "type") restart();
    last = next;
  };

  const move = () => update("move");
  const type = () => update("type");
  const layout = () => update("layout");
  const focus = () => {
    hide();
    last = null;
    requestAnimationFrame(move);
  };
  const blur = () => {
    last = null;
    hide();
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
  field.addEventListener("focusout", blur);
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
      if (shown) restart();
    },
    destroy() {
      cancelAnimationFrame(frame);
      blink?.cancel();
      observer.disconnect();
      document.removeEventListener("selectionchange", changed);
      field.removeEventListener("select", move);
      field.removeEventListener("input", type);
      field.removeEventListener("focusin", focus);
      field.removeEventListener("focusout", blur);
      field.removeEventListener("scroll", layout);
      field.removeEventListener("compositionstart", compose);
      field.removeEventListener("compositionend", compose);
      window.removeEventListener("resize", layout);
      layer.remove();
      mirror?.remove();
      field.style.caretColor = own;
    },
  };
}

function resolve(style: CaretOptions["style"] = "ios"): Style {
  return typeof style === "string" ? STYLES[style] : style;
}
