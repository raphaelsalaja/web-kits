// Draws the liquid morph with copies on a layer over the page. The two shapes
// are SVG paths joined by a gooey filter, a Gaussian blur and an alpha
// threshold, which is what blurring a signed distance field and cutting it at
// zero comes to. The lens is an feDisplacementMap on the content's copy, as a
// CSS `filter`, which every engine draws on HTML. A `backdrop-filter` lens
// would bend the page behind as well, but only Chromium draws one with an SVG
// filter, and iOS's lens bends the content, not the page.

import { createOverlay, type Overlay, type Point } from "../debug.ts";
import {
  createClock,
  createHider,
  type Effect,
  type ElementSource,
  type ReducedMotion,
  reduced,
  relative,
  resolve,
} from "../dom.ts";
import { cloneWindow } from "../genie/clone.ts";
import { continuousRect } from "../shapes.ts";
import { toLinear } from "../spring.ts";
import {
  createMorph,
  fadeBlur,
  MORPH,
  type MorphFrame,
  type MorphGeometry,
  type MorphShape,
} from "./glass.ts";

export type MorphControllerOptions = {
  /** The button the popup morphs out of and back into. */
  target: ElementSource;
  /**
   * The label inside the button that the popup grows from, like SwiftUI's
   * `matchedTransitionSource` on the label rather than the button. Defaults
   * to the button's first element.
   */
  pivot?: ElementSource;
  /** The positioned element the copies are drawn in. Defaults to the viewport. */
  bounds?: ElementSource;
  /**
   * The glass both shapes are filled with. Defaults to the popup's
   * background colour.
   */
  fill?: string;
  /** Bends the content at the rim as it grows. On by default. */
  lens?: boolean;
  /** Hides the button while the popup's open, as iOS absorbs it. */
  hideTarget?: boolean;
  reducedMotion?: ReducedMotion;
  /**
   * Plays slower or faster, like the Simulator's Slow Animations. 0.1 is ten
   * times slower. It changes a run that's already going.
   */
  speed?: number;
  /** Outlines both shapes in blue and marks their centres in orange. */
  debug?: boolean;
  /** Starts open, with no animation. Closed by default, and hidden. */
  open?: boolean;
  onStart?: (open: boolean) => void;
  onFrame?: (frame: MorphFrame) => void;
  onLand?: (open: boolean) => void;
};

export type MorphController = Effect & {
  set(options: Partial<MorphControllerOptions>): void;
};

const SVG = "http://www.w3.org/2000/svg";
// Outlasts any of the morph's springs. The clock is finished the moment the
// morph lands.
const HOLD = 10_000;
const FALLBACK_FILL = "rgb(255 255 255 / 0.96)";
let count = 0;

/**
 * Morphs `element` out of `target` the way iOS 27 opens a glass button's
 * popover or menu, and back in. While the copies are drawn, an animation on
 * the element holds it hidden, and finishes when the morph lands, so anything
 * waiting on the element's animations, like Base UI's exit, waits for it.
 */
export function morphController(
  element: HTMLElement,
  initial: MorphControllerOptions,
): MorphController {
  let options = initial;
  let isOpen = options.open ?? false;
  let geometry: MorphGeometry | null = null;
  let morph: ReturnType<typeof createMorph> | null = null;
  let scene: Scene | null = null;
  let overlay: Overlay | null = null;
  let clock: Animation | null = null;
  let frame = 0;
  const button = createHider();
  const speed = () => options.speed ?? 1;
  const time = createClock(speed);
  const animate = (keyframes: Keyframe[], timing: KeyframeAnimationOptions) => {
    const animation = element.animate(keyframes, timing);
    animation.playbackRate = speed();
    return animation;
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    clock?.cancel();
    clock = null;
  };

  const release = () => {
    scene?.dispose();
    scene = null;
    overlay?.dispose();
    overlay = null;
  };

  const conceal = () => {
    clock = element.animate(
      { opacity: [0, 0] },
      { duration: 0, fill: "forwards" },
    );
  };

  const absorb = (open: boolean) => {
    const target = resolve(options.target);
    if (open && target && options.hideTarget !== false) button.hide(target);
    else button.reveal();
  };

  const jump = (to: boolean) => {
    stop();
    release();
    isOpen = to;
    morph?.jump(to, time());
    absorb(to);
    if (!to) conceal();
  };

  const play = (to: boolean) => {
    isOpen = to;
    stop();
    const target = resolve(options.target);

    if (reduced(options.reducedMotion) || !target) {
      release();
      morph?.jump(to, time());
      const { easing, duration } = toLinear(MORPH.reduceMotion);
      const current = animate(
        [{ opacity: to ? 0 : 1 }, { opacity: to ? 1 : 0 }],
        { duration, easing, fill: to ? "none" : "forwards" },
      );
      clock = current;
      options.onStart?.(to);
      if (to) absorb(true);
      current.finished.then(
        () => {
          if (clock !== current) return;
          if (!to) absorb(false);
          options.onLand?.(to);
        },
        () => {},
      );
      return;
    }

    const current = animate([{ opacity: 0 }, { opacity: 0 }], {
      duration: HOLD,
      fill: to ? "none" : "forwards",
    });
    clock = current;

    if (!scene) {
      scene = createScene(element, target, options);
      geometry = scene.measure();
    }
    if (!morph) {
      morph = createMorph(() => geometry as MorphGeometry);
      morph.jump(!to, time());
    }
    const drawn = scene;
    const run = morph;
    if (to) run.show(time());
    else run.hide(time());
    absorb(true);
    options.onStart?.(to);

    const tick = () => {
      if (clock !== current) return;
      const now = time();
      // A positioner can place the popup a frame after it mounts.
      geometry = drawn.measure();
      const sampled = run.sample(now);
      drawn.draw(sampled, options.lens !== false);
      if (options.debug) {
        overlay ??= createOverlay(resolve(options.bounds));
        overlay.draw(...outlines(sampled));
      } else {
        overlay?.dispose();
        overlay = null;
      }
      options.onFrame?.(sampled);
      if (run.landed(now)) {
        release();
        if (!to) absorb(false);
        current.finish();
        options.onLand?.(to);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
  };

  if (isOpen) jump(true);
  else conceal();

  return {
    get isOpen() {
      return isOpen;
    },
    open({ instant = false } = {}) {
      if (instant) jump(true);
      else if (!isOpen) play(true);
    },
    close({ instant = false } = {}) {
      if (instant) jump(false);
      else if (isOpen) play(false);
    },
    toggle() {
      play(!isOpen);
    },
    set(next) {
      options = { ...options, ...next };
      if (clock && clock.playbackRate !== speed())
        clock.updatePlaybackRate(speed());
    },
    destroy() {
      stop();
      release();
      button.reveal();
    },
  };
}

type Scene = ReturnType<typeof createScene>;

const size = (element: Element) => {
  const computed = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  return {
    width: Number.parseFloat(computed.width) || box.width,
    height: Number.parseFloat(computed.height) || box.height,
  };
};

const radiusOf = (element: Element) =>
  Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;

const SHADOW =
  /((?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[\da-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?(\s+inset)?/gi;

// The popup's own shadow and hairline, so the joined shapes look like it at
// rest: the widest outer shadow, and the first inset one as the hairline.
function surfaceOf(popup: HTMLElement) {
  const shadows = [...getComputedStyle(popup).boxShadow.matchAll(SHADOW)].map(
    ([, color, x, y, blur, , inset]) => ({
      color,
      x: Number(x),
      y: Number(y),
      blur: Number(blur),
      inset: Boolean(inset),
    }),
  );
  const outer = shadows
    .filter((shadow) => !shadow.inset)
    .sort((a, b) => b.blur - a.blur)[0];
  const line = shadows.find((shadow) => shadow.inset);
  return {
    shadow: outer ?? { color: "transparent", x: 0, y: 0, blur: 0 },
    hairline: line?.color ?? "transparent",
  };
}

// A copy of an element without its own surface, which the shapes draw
// instead, and with the colour and type it inherited where it was.
function bare(source: Element, width: number, height: number) {
  const holder = document.createElement("div");
  const computed = getComputedStyle(source);
  const copy = cloneWindow(source as HTMLElement, width, height);
  for (const [name, value] of [
    ["background", "none"],
    ["box-shadow", "none"],
    ["border-color", "transparent"],
    ["outline", "none"],
    ["backdrop-filter", "none"],
    ["-webkit-backdrop-filter", "none"],
  ])
    copy.style.setProperty(name, value);
  Object.assign(holder.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    color: computed.color,
    font: computed.font,
    letterSpacing: computed.letterSpacing,
    textAlign: computed.textAlign,
    // Safari blurs a copy on the CPU unless it has a layer of its own.
    willChange: "filter, opacity",
  });
  holder.append(copy);
  return holder;
}

const svg = <K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string | number> = {},
  children: SVGElement[] = [],
) => {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, String(value));
  node.append(...children);
  return node;
};

// Set as a style, which takes any CSS colour, where the attribute might not.
const flood = (color: string, result: string) => {
  const node = svg("feFlood", { result });
  node.style.setProperty("flood-color", color);
  return node;
};

// The map the lens bends with: red and green push each pixel along the
// outward normal of a squircle, harder toward its rim. iOS reads its
// displacement from the SDF; this shape is a guess at it.
let lensMap: string | null = null;
function lensImage() {
  if (lensMap) return lensMap;
  const side = 128;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(side, side);
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const u = ((i + 0.5) / side) * 2 - 1;
      const v = ((j + 0.5) / side) * 2 - 1;
      const reach = (u ** 4 + v ** 4) ** 0.25;
      const rim = Math.max(0, (reach - 0.55) / 0.45) ** 2;
      const length = Math.hypot(u ** 3, v ** 3) || 1;
      const k = (j * side + i) * 4;
      image.data[k] = 128 + 127 * Math.min(rim, 1) * (u ** 3 / length);
      image.data[k + 1] = 128 + 127 * Math.min(rim, 1) * (v ** 3 / length);
      image.data[k + 2] = 128;
      image.data[k + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  lensMap = canvas.toDataURL();
  return lensMap;
}

function createScene(
  popup: HTMLElement,
  target: HTMLElement,
  options: MorphControllerOptions,
) {
  const bounds = resolve(options.bounds);
  const pivotElement = (resolve(options.pivot) ??
    target.firstElementChild ??
    target) as HTMLElement;
  const id = `springboard-morph-${++count}`;
  const box = size(popup);
  const buttonSize = size(target);
  const pivotSize = size(pivotElement);
  const tall = Math.max(box.width, box.height);
  const fill =
    options.fill ??
    (() => {
      const colour = getComputedStyle(popup).backgroundColor;
      return colour && colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent"
        ? colour
        : FALLBACK_FILL;
    })();

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("data-morph", "");
  Object.assign(layer.style, {
    position: bounds ? "absolute" : "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: bounds ? "auto" : "2147483647",
  });

  // The field: both shapes, blurred together and cut at half alpha, then
  // filled, outlined with a hairline and shadowed like the glass at rest.
  const { shadow, hairline } = surfaceOf(popup);
  const blur = svg("feGaussianBlur", {
    in: "SourceGraphic",
    stdDeviation: 0.01,
    result: "blur",
  });
  const field = svg(
    "filter",
    {
      id: `${id}-field`,
      filterUnits: "userSpaceOnUse",
      "color-interpolation-filters": "sRGB",
    },
    [
      blur,
      svg("feColorMatrix", {
        in: "blur",
        type: "matrix",
        values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 24 -11",
        result: "shape",
      }),
      svg("feGaussianBlur", {
        in: "shape",
        stdDeviation: shadow.blur / 2,
        result: "spread",
      }),
      svg("feOffset", {
        in: "spread",
        dx: shadow.x,
        dy: shadow.y,
        result: "drop",
      }),
      flood(shadow.color, "dark"),
      svg("feComposite", {
        in: "dark",
        in2: "drop",
        operator: "in",
        result: "shadow",
      }),
      flood(fill, "glass"),
      svg("feComposite", {
        in: "glass",
        in2: "shape",
        operator: "in",
        result: "body",
      }),
      svg("feMorphology", {
        in: "shape",
        operator: "erode",
        radius: 0.75,
        result: "inner",
      }),
      svg("feComposite", {
        in: "shape",
        in2: "inner",
        operator: "out",
        result: "edge",
      }),
      flood(hairline, "line"),
      svg("feComposite", {
        in: "line",
        in2: "edge",
        operator: "in",
        result: "hairline",
      }),
      svg("feMerge", {}, [
        svg("feMergeNode", { in: "shadow" }),
        svg("feMergeNode", { in: "body" }),
        svg("feMergeNode", { in: "hairline" }),
      ]),
    ],
  );
  const map = svg("feImage", {
    x: 0,
    y: 0,
    width: box.width,
    height: box.height,
    preserveAspectRatio: "none",
    result: "map",
  });
  if (options.lens !== false) {
    const href = lensImage();
    map.setAttribute("href", href);
    map.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", href);
  }
  const bend = svg("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "map",
    scale: 0,
    xChannelSelector: "R",
    yChannelSelector: "G",
  });
  const lens = svg(
    "filter",
    {
      id: `${id}-lens`,
      x: "-10%",
      y: "-10%",
      width: "120%",
      height: "120%",
      "color-interpolation-filters": "sRGB",
    },
    [map, bend],
  );
  const popoverShape = svg("path", { fill: "#000" });
  const sourceShape = svg("path", { fill: "#000" });
  const stage = svg("svg", { width: "100%", height: "100%" }, [
    svg("defs", {}, [field, lens]),
    svg("g", { filter: `url(#${id}-field)` }, [popoverShape, sourceShape]),
  ]);
  Object.assign(stage.style, {
    position: "absolute",
    inset: "0",
    overflow: "visible",
  });

  // The popover's view: a box as wide as the popup and as tall as the
  // larger of its sides, clipped to the morph's height around its middle.
  const view = (width: number, height: number) => {
    const node = document.createElement("div");
    Object.assign(node.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${width}px`,
      height: `${height}px`,
      transformOrigin: "50% 50%",
      willChange: "transform, clip-path",
    });
    return node;
  };
  const popoverView = view(box.width, tall);
  const inner = document.createElement("div");
  Object.assign(inner.style, { position: "absolute", inset: "0" });
  const content = bare(popup, box.width, box.height);
  content.style.top = `${(tall - box.height) / 2}px`;
  inner.append(content);
  popoverView.append(inner);

  // The button's view, squaring up and shrinking toward a quarter.
  const sourceView = view(buttonSize.width, buttonSize.height);
  const glass = bare(target, buttonSize.width, buttonSize.height);
  const label = bare(pivotElement, pivotSize.width, pivotSize.height);
  sourceView.append(glass, label);

  // The button shrinks under the popover, as on iOS.
  layer.append(stage, sourceView, popoverView);
  (bounds ?? document.body).append(layer);

  const shape = (path: SVGPathElement, s: MorphShape) => {
    const width = s.width * s.scale;
    const height = s.height * s.scale;
    path.setAttribute("d", continuousRect(width, height, s.radius * s.scale));
    path.setAttribute(
      "transform",
      `translate(${(s.x - width / 2).toFixed(2)} ${(s.y - height / 2).toFixed(2)})`,
    );
  };

  // The field is filtered only as far as its blur and shadow reach, since
  // every pixel of the region is redrawn each frame.
  const region = (frame: MorphFrame) => {
    const reach =
      1.5 * (frame.field + shadow.blur) +
      Math.max(Math.abs(shadow.x), Math.abs(shadow.y)) +
      1;
    const edges = [frame.popover, frame.source].map((s) => ({
      x: s.x - (s.width * s.scale) / 2,
      y: s.y - (s.height * s.scale) / 2,
      right: s.x + (s.width * s.scale) / 2,
      bottom: s.y + (s.height * s.scale) / 2,
    }));
    const x = Math.min(...edges.map((e) => e.x)) - reach;
    const y = Math.min(...edges.map((e) => e.y)) - reach;
    field.setAttribute("x", `${x}`);
    field.setAttribute("y", `${y}`);
    field.setAttribute(
      "width",
      `${Math.max(...edges.map((e) => e.right)) + reach - x}`,
    );
    field.setAttribute(
      "height",
      `${Math.max(...edges.map((e) => e.bottom)) + reach - y}`,
    );
  };

  // A filter costs a pass even when it draws nothing, so copies that can't
  // be seen are hidden and blurs under a quarter of a pixel are left off.
  const blurred = (px: number) => (px < 0.25 ? "" : `blur(${px}px)`);
  const fade = (node: HTMLElement, opacity: number, filter: string) => {
    const hidden = opacity < 1 / 255;
    node.style.opacity = `${opacity}`;
    node.style.visibility = hidden ? "hidden" : "";
    node.style.filter = hidden || !filter ? "none" : filter;
  };

  let measured: MorphGeometry;
  return {
    /** Measures the button, its label and the popup where they are now. */
    measure(): MorphGeometry {
      const place = relative(popup, bounds);
      const source = relative(target, bounds);
      const pivot = relative(pivotElement, bounds);
      // The popup's own transform is left out; its centre is kept.
      measured = {
        source,
        target: {
          x: place.x + place.width / 2 - box.width / 2,
          y: place.y + place.height / 2 - box.height / 2,
          width: box.width,
          height: box.height,
        },
        pivot,
        sourceRadius: radiusOf(target),
        targetRadius: radiusOf(popup),
      };
      return measured;
    },
    draw(frame: MorphFrame, bending: boolean) {
      const { popover, source, opacity, progress } = frame;
      shape(popoverShape, popover);
      shape(sourceShape, source);
      blur.setAttribute("stdDeviation", `${Math.max(frame.field / 2, 0.01)}`);
      region(frame);

      // Everything in the popover's view is drawn at its own size and
      // scaled with the view, as UIKit scales the layers.
      const top = (tall - popover.height) / 2;
      popoverView.style.transform = `translate(${popover.x - box.width / 2}px, ${popover.y - tall / 2}px) scale(${popover.scale})`;
      popoverView.style.clipPath = `inset(${top}px 0 round ${popover.radius}px)`;
      fade(content, opacity, blurred(fadeBlur(opacity)));
      // The map moves a pixel at most half the scale.
      const lensing = bending && Math.abs(frame.lens) >= 0.5;
      if (lensing) {
        map.setAttribute("y", `${top}`);
        map.setAttribute("height", `${popover.height}`);
        bend.setAttribute("scale", `${-frame.lens}`);
      }
      inner.style.filter =
        [lensing ? `url(#${id}-lens)` : "", blurred(frame.lensBlur)]
          .filter(Boolean)
          .join(" ") || "none";

      const offset = (buttonSize.width - source.width) / 2;
      sourceView.style.transform = `translate(${source.x - buttonSize.width / 2}px, ${source.y - buttonSize.height / 2}px) scale(${source.scale})`;
      sourceView.style.clipPath = `inset(0 ${offset}px round ${source.radius}px)`;
      // The popover's glass is drawn under both views, so the button's
      // copies fade as much as the popover's content covers them.
      const shown = 1 - coverage(source, popover) * opacity;
      fade(glass, (1 - progress) * shown, blurred(fadeBlur(1 - progress)));
      label.style.left = `${measured.pivot.x - measured.source.x}px`;
      label.style.top = `${measured.pivot.y - measured.source.y}px`;
      fade(
        label,
        Math.min(Math.max(progress, 0), 1) * shown,
        blurred(fadeBlur(progress)),
      );
    },
    dispose() {
      layer.remove();
    },
  };
}

/** How much of `a`'s drawn box lies inside `b`'s, from 0 to 1. */
function coverage(a: MorphShape, b: MorphShape) {
  const span = (s: MorphShape) => {
    const width = s.width * s.scale;
    const height = s.height * s.scale;
    return [
      s.x - width / 2,
      s.y - height / 2,
      s.x + width / 2,
      s.y + height / 2,
    ];
  };
  const [ax0, ay0, ax1, ay1] = span(a);
  const [bx0, by0, bx1, by1] = span(b);
  const area = (ax1 - ax0) * (ay1 - ay0);
  if (area <= 0) return 1;
  const across = Math.max(Math.min(ax1, bx1) - Math.max(ax0, bx0), 0);
  const down = Math.max(Math.min(ay1, by1) - Math.max(ay0, by0), 0);
  return Math.min((across * down) / area, 1);
}

// Each shape's outline, and both centres.
function outlines(frame: MorphFrame): [Point[][], Point[]] {
  const ring = (s: MorphShape): Point[] => {
    const w = (s.width * s.scale) / 2;
    const h = (s.height * s.scale) / 2;
    return [
      { x: s.x - w, y: s.y - h },
      { x: s.x + w, y: s.y - h },
      { x: s.x + w, y: s.y + h },
      { x: s.x - w, y: s.y + h },
      { x: s.x - w, y: s.y - h },
    ];
  };
  return [
    [ring(frame.popover), ring(frame.source)],
    [
      { x: frame.popover.x, y: frame.popover.y },
      { x: frame.source.x, y: frame.source.y },
    ],
  ];
}
