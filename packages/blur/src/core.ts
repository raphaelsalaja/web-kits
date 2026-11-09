import { BOTTOM, CURVE, type Recipe, SHARP, SOFT, TOP } from "./apple.ts";

export type Side = "top" | "bottom" | "left" | "right";

/**
 * How the wide blur is blended over the sharp one.
 *
 * - `"blend"` stacks one layer per blend mode with `mix-blend-mode`, the way
 *   iOS does it. Only WebKit blends a `backdrop-filter` this way.
 * - `"filter"` does the three blends inside one SVG filter used as a
 *   `backdrop-filter`. Only Chromium takes an SVG filter there.
 * - `"plain"` lays the wide blur over at one opacity, for everything else.
 * - `"auto"` picks the first of those the browser can draw.
 */
export type Technique = "auto" | "blend" | "filter" | "plain";

export type ProgressiveBlurOptions = {
  /** The side the bar is on, where the blur is strongest. Defaults to `"top"`. */
  side?: Side;
  /** The page's background, which the edge fades into. Defaults to the first background behind the element. */
  color?: string;
  /** Apple's light or dark weights. `"auto"` follows `prefers-color-scheme`. */
  scheme?: "light" | "dark" | "auto";
  /** Where the blur starts to fall off, as a fraction of the element's size. */
  start?: number;
  /** Where it reaches nothing. */
  end?: number;
  technique?: Technique;
};

export type ProgressiveBlur = {
  /** Change any option without starting over. */
  set: (options: ProgressiveBlurOptions) => void;
  /** Remove the layers and put the element back the way it was. */
  destroy: () => void;
};

/** How many backdrop layers draw the variable blur. */
const LEVELS = 4;
/** How many stops each mask gets between `start` and `end`. */
const STOPS = 24;
const DIRECTION: Record<Side, string> = {
  top: "to bottom",
  bottom: "to top",
  left: "to right",
  right: "to left",
};

/** Apple's mask at `t`, from 0 at the bar to 1 at the far side. */
function mask(t: number, start: number, end: number) {
  if (t <= start) return 1;
  if (t >= end) return 0;
  const u = ((t - start) / (end - start)) * (CURVE.length - 1);
  const i = Math.floor(u);
  return CURVE[i] + (CURVE[i + 1] - CURVE[i]) * (u - i);
}

function gradient(side: Side, start: number, end: number, alpha: (m: number) => number) {
  const stops = [0, start];
  for (let i = 1; i < STOPS; i++) stops.push(start + ((end - start) * i) / STOPS);
  stops.push(end, 1);
  const list = stops.map((t) => {
    const a = Math.round(alpha(mask(t, start, end)) * 1000) / 1000;
    return `rgb(0 0 0 / ${a}) ${Math.round(t * 10000) / 100}%`;
  });
  return `linear-gradient(${DIRECTION[side]}, ${list.join(", ")})`;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** The variable blur at mask `m`. */
function sharp(m: number) {
  let i = 1;
  while (i < SHARP.length - 1 && SHARP[i][0] < m) i++;
  const [m0, s0] = SHARP[i - 1];
  const [m1, s1] = SHARP[i];
  return s0 + ((s1 - s0) * clamp((m - m0) / (m1 - m0)));
}

/**
 * How far the result moves towards the wide blur, at mask `m`, where the wide
 * blur is lighter than the sharp one (`up`) and where it's darker (`down`).
 * Lighten only acts on the first and darken only on the second.
 */
function reach(r: Recipe, m: number) {
  const n = r.normal * m;
  return { up: n + r.lighten * m * (1 - n), down: n + r.darken * m * (1 - n) };
}

function detect(): Exclude<Technique, "auto"> {
  const nav = navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } };
  if (nav.userAgentData?.brands.some(({ brand }) => brand === "Chromium")) return "filter";
  const ua = navigator.userAgent;
  if (/Chrome\//.test(ua)) return "filter";
  if (/AppleWebKit/.test(ua) && !/Android/.test(ua)) return "blend";
  return "plain";
}

/** The first background behind `element` that isn't transparent. */
function backdropColor(element: HTMLElement) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return "Canvas";
}

const SVG = "http://www.w3.org/2000/svg";
const filters = new Map<string, string>();

/** One SVG filter per recipe, doing all three blends at full strength. */
function svgFilter(r: Recipe) {
  const key = `${r.fill}-${r.normal}-${r.lighten}-${r.darken}`;
  const known = filters.get(key);
  if (known && document.getElementById(known)) return known;
  const id = `web-kits-blur-${filters.size}`;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  svg.innerHTML = `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${r.fill}" edgeMode="duplicate" result="b"/>
    <feComposite in="SourceGraphic" in2="b" operator="arithmetic" k2="${1 - r.normal}" k3="${r.normal}" result="n"/>
    <feBlend in="n" in2="b" mode="lighten" result="lighter"/>
    <feComposite in="n" in2="lighter" operator="arithmetic" k2="${1 - r.lighten}" k3="${r.lighten}" result="l"/>
    <feBlend in="l" in2="b" mode="darken" result="darker"/>
    <feComposite in="l" in2="darker" operator="arithmetic" k2="${1 - r.darken}" k3="${r.darken}"/>
  </filter>`;
  document.body.append(svg);
  filters.set(key, id);
  return id;
}

type Layer = { backdrop?: string; blend?: string; background?: string; alpha: (m: number) => number };

function layers(r: Recipe, technique: Exclude<Technique, "auto">, color: string): Layer[] {
  // The veil goes under the blur, so the wide blur also smears its fade.
  const out: Layer[] = [{ background: color, alpha: (m) => r.veil * m }];
  const most = sharp(1);
  for (let k = 1; k <= LEVELS; k++) {
    const from = (most * (k - 1)) / LEVELS;
    const to = (most * k) / LEVELS;
    // Each layer blurs what the ones under it already blurred, so their
    // variances add up to the level reached.
    const sigma = Math.sqrt(to * to - from * from);
    out.push({ backdrop: `blur(${sigma.toFixed(2)}px)`, alpha: (m) => clamp((sharp(m) - from) / (to - from)) });
  }
  const wide = `blur(${r.fill}px)`;
  if (technique === "blend") {
    if (r.normal) out.push({ backdrop: wide, alpha: (m) => r.normal * m });
    if (r.lighten) out.push({ backdrop: wide, blend: "lighten", alpha: (m) => r.lighten * m });
    if (r.darken) out.push({ backdrop: wide, blend: "darken", alpha: (m) => r.darken * m });
  } else if (technique === "filter") {
    const full = reach(r, 1);
    out.push({
      backdrop: `url(#${svgFilter(r)})`,
      // The filter blends at full strength, so its opacity carries the mask.
      alpha: (m) => {
        const { up, down } = reach(r, m);
        return (up / full.up + down / full.down) / 2;
      },
    });
  } else {
    out.push({
      backdrop: wide,
      alpha: (m) => {
        const { up, down } = reach(r, m);
        return (up + down) / 2;
      },
    });
  }
  return out;
}

/**
 * Fills `host` with Apple's progressive blur. Size and position the element
 * yourself, over the content it should blur, and leave it empty.
 */
export function progressiveBlur(host: HTMLElement, initial: ProgressiveBlurOptions = {}): ProgressiveBlur {
  let options = initial;
  let nodes: HTMLElement[] = [];
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const restore = { position: host.style.position, pointerEvents: host.style.pointerEvents };
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.pointerEvents = "none";

  function render() {
    for (const node of nodes) node.remove();
    const side = options.side ?? "top";
    const edge = side === "bottom" ? BOTTOM : TOP;
    const start = options.start ?? edge.start;
    const end = options.end ?? edge.end;
    const scheme = options.scheme ?? "auto";
    const recipe = SOFT[scheme === "auto" ? (dark.matches ? "dark" : "light") : scheme];
    const technique = !options.technique || options.technique === "auto" ? detect() : options.technique;
    const color = options.color ?? backdropColor(host);

    nodes = layers(recipe, technique, color).map((layer) => {
      const node = document.createElement("div");
      const style = node.style;
      style.cssText = "position:absolute;inset:0;pointer-events:none";
      if (layer.backdrop) {
        style.setProperty("backdrop-filter", layer.backdrop);
        style.setProperty("-webkit-backdrop-filter", layer.backdrop);
      }
      if (layer.blend) style.mixBlendMode = layer.blend;
      if (layer.background) style.background = layer.background;
      const image = gradient(side, start, end, layer.alpha);
      style.setProperty("mask-image", image);
      style.setProperty("-webkit-mask-image", image);
      return node;
    });
    host.prepend(...nodes);
  }

  const onScheme = () => {
    if ((options.scheme ?? "auto") === "auto") render();
  };
  dark.addEventListener("change", onScheme);
  render();

  return {
    set(next) {
      options = { ...options, ...next };
      render();
    },
    destroy() {
      dark.removeEventListener("change", onScheme);
      for (const node of nodes) node.remove();
      nodes = [];
      host.style.position = restore.position;
      host.style.pointerEvents = restore.pointerEvents;
    },
  };
}
