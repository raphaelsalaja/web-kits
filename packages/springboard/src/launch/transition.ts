// The iOS app open and close, as SpringBoard's
// SBFullScreenToHomeIconZoomSwitcherModifier drives it. The card is the
// full-screen app scaled down to the icon's width, with its layer height
// cropped to the icon's shape, so scale, height and centre all ride one spring.
// The corner radius has its own spring in the layer's (unscaled) space.
//
// SBSwitcherGenieEffectView then draws the card through a 3×3 mesh. Each
// vertex has its own spring, and the rows' responses differ with how far the
// icon sits from the middle of the screen, so the card bends as it grows.

import type { Rect } from "../geometry.ts";
import {
  atRest,
  createFluid,
  type Fluid,
  type Spring,
  spring,
  springboard,
} from "../spring.ts";

/** The springs the card rides. SpringBoard's are the default. */
export type AppSprings = {
  open: Spring;
  close: Spring;
  home: { spring: Spring; scale: number };
  cornerReset: { open: number; close: number; lead: number };
};

export type AppGeometry = {
  icon: Rect;
  screen: Rect;
  iconRadius: number;
  screenRadius: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The card at progress 0 (the icon) to 1 (the screen). */
export function card(geometry: AppGeometry, progress: number) {
  const { icon, screen } = geometry;
  const start = icon.width / screen.width;
  const scale = lerp(start, 1, progress);
  const layerHeight = lerp(icon.height / start, screen.height, progress);
  const centerX = lerp(
    icon.x + icon.width / 2,
    screen.x + screen.width / 2,
    progress,
  );
  const centerY = lerp(
    icon.y + icon.height / 2,
    screen.y + screen.height / 2,
    progress,
  );
  const width = screen.width * scale;
  const height = layerHeight * scale;
  return {
    scale,
    layerHeight,
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

/**
 * `cornerRadiiForIndex:` in layer space: half the window's shorter side
 * while the card zooms, then the display's radius opening, or the icon's over
 * the card's starting scale closing.
 */
export function cornerTargets({
  icon,
  screen,
  iconRadius,
  screenRadius,
}: AppGeometry) {
  return {
    zoom: Math.min(screen.width, screen.height) / 2,
    open: screenRadius,
    close: iconRadius / (icon.width / screen.width),
  };
}

/** SBSwitcherGenieAttributes on an iPhone. */
export const APP_GENIE = {
  /** `rows` and `columns`: the mesh has one more vertex a side. */
  segments: 2,
  /** `genieScale`: the vertices start on a grid this size against the window's. */
  scale: 0.4,
  /** `multiplier`: how far a row's response strays from the layout spring's. */
  multiplier: 0.5,
  /** A negative `genieAmount`, for icons above the middle, is scaled by this. */
  above: 0.75,
};

const VERTICES = (APP_GENIE.segments + 1) ** 2;
const CENTRE = (VERTICES - 1) / 2;

/** `genieAmount`: the icon's height on the screen, −1 at the top to 1 at the bottom. */
export function genieAmount({ icon, screen }: AppGeometry) {
  const y = icon.y + icon.height / 2 - screen.y;
  const amount = Math.min(Math.max((2 * y) / screen.height - 1, -1), 1);
  return amount < 0 ? amount * APP_GENIE.above : amount;
}

/**
 * Each row of vertices has its own spring around the layout spring's
 * response. Opening, the rows furthest from the icon are fastest, so the card
 * stretches away from it. Closing, the nearest are, so it funnels back in.
 */
export function genieSprings(
  geometry: AppGeometry,
  open: boolean,
  springs: AppSprings = springboard,
): Spring[] {
  const layout = open ? springs.open : springs.close;
  const amount = genieAmount(geometry);
  const g = (open ? -amount : amount) * APP_GENIE.multiplier;
  const n = APP_GENIE.segments;
  return Array.from({ length: n + 1 }, (_, i) => {
    const row = i / n;
    const weight = amount >= 0 ? Math.sqrt(row) : 1 - Math.sqrt(1 - row);
    return spring(
      layout.response * lerp(1 + g, 1 - g, weight),
      layout.dampingRatio,
    );
  });
}

/**
 * Where the vertex springs head: the unit grid open, and a grid of
 * `genieScale` around the icon's left edge and the middle of the window when
 * closed. Values are x, y pairs, row by row.
 */
export function genieTargets({ icon, screen }: AppGeometry, open: boolean) {
  const n = APP_GENIE.segments;
  const s = open ? 0 : 1 - APP_GENIE.scale;
  const x = (icon.x - screen.x) / screen.width;
  return Array.from({ length: VERTICES }, (_, v) => {
    const row = Math.floor(v / (n + 1)) / n;
    const column = (v % (n + 1)) / n;
    return [lerp(column, x, s), lerp(row, 0.5, s)];
  }).flat();
}

export type MeshVertex = {
  /** On the screen. */
  x: number;
  y: number;
  /** In the cropped layer, from 0 to `screen.width` and `layerHeight`. */
  u: number;
  v: number;
};

/**
 * `_updateMeshTransform`: the vertex springs' values drawn into the card.
 * The springs move inside a grid that shrinks with the card, so each one is
 * scaled out from the centre vertex, and the card is shifted back by the
 * icon's offset from the middle of the screen. The grid and `card()`'s frame
 * only agree at either end, so midway the card is narrower than its frame
 * even before the rows pull apart.
 */
export function appMesh(
  geometry: AppGeometry,
  progress: number,
  values: readonly number[],
): MeshVertex[] {
  const { icon, screen } = geometry;
  const { width, height } = screen;
  const n = APP_GENIE.segments;
  const start = icon.width / width;
  const minimized = start / APP_GENIE.scale;
  const scale = lerp(start, 1, progress);
  const grow = lerp(minimized, 1, progress) / scale;
  const layerHeight = lerp(icon.height / start, height, progress);
  const counter =
    ((1 - APP_GENIE.scale) * (0.5 - (icon.x - screen.x) / width) * (grow - 1)) /
    (1 / APP_GENIE.scale - 1);
  const left =
    lerp(icon.x + icon.width / 2, screen.x + width / 2, progress) -
    (width * scale) / 2;
  const top =
    lerp(icon.y + icon.height / 2, screen.y + height / 2, progress) -
    (layerHeight * scale) / 2;
  const cx = values[CENTRE * 2];
  const cy = values[CENTRE * 2 + 1];
  return Array.from({ length: VERTICES }, (_, v) => {
    const x = values[v * 2];
    const y = values[v * 2 + 1];
    return {
      x: left + width * scale * (counter + cx + grow * (x - cx)),
      y: top + layerHeight * scale * (cy + grow * (y - cy)),
      u: (width * (v % (n + 1))) / n,
      v: (layerHeight * Math.floor(v / (n + 1))) / n,
    };
  });
}

/**
 * How Core Animation fills a mesh between its vertices: a uniform cubic
 * B-spline surface, with a reflected vertex past each edge so the outline
 * still runs through the edge vertices. `s` and `t` run from 0 to 1 across
 * and down.
 */
export function meshPoint(
  mesh: readonly MeshVertex[],
  s: number,
  t: number,
): { x: number; y: number } {
  const n = Math.round(Math.sqrt(mesh.length)) - 1;
  const at = (i: number, j: number): [number, number] => {
    if (i < 0) return reflect(at(0, j), at(1, j));
    if (i > n) return reflect(at(n, j), at(n - 1, j));
    if (j < 0) return reflect(at(i, 0), at(i, 1));
    if (j > n) return reflect(at(i, n), at(i, n - 1));
    const vertex = mesh[i * (n + 1) + j];
    return [vertex.x, vertex.y];
  };
  const [row, v] = span(t, n);
  const [column, u] = span(s, n);
  const bv = basis(v);
  const bu = basis(u);
  let x = 0;
  let y = 0;
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) {
      const [px, py] = at(row + a - 1, column + b - 1);
      const w = bv[a] * bu[b];
      x += w * px;
      y += w * py;
    }
  }
  return { x, y };
}

const reflect = (
  edge: [number, number],
  inner: [number, number],
): [number, number] => [2 * edge[0] - inner[0], 2 * edge[1] - inner[1]];

function span(t: number, n: number): [number, number] {
  const x = Math.min(Math.max(t, 0), 1) * n;
  const index = Math.min(Math.floor(x), n - 1);
  return [index, x - index];
}

function basis(t: number) {
  const u = 1 - t;
  return [
    (u * u * u) / 6,
    (3 * t * t * t - 6 * t * t + 4) / 6,
    (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6,
    (t * t * t) / 6,
  ];
}

export function createAppTransition(
  geometry: () => AppGeometry,
  springs: AppSprings = springboard,
) {
  const progress = createFluid(0);
  const radius = createFluid(cornerTargets(geometry()).close);
  const home = createFluid(1);
  const vertices: Fluid[] = genieTargets(geometry(), false).map((x) =>
    createFluid(x),
  );
  let reset: {
    at: number;
    to: number;
    spring: Spring;
  } | null = null;
  let opening = false;

  const go = (open: boolean, now: number) => {
    const s = open ? springs.open : springs.close;
    const g = geometry();
    const targets = cornerTargets(g);
    const state = progress.sample(now);
    if (open && state.position < 1e-4 && Math.abs(state.velocity) < 1e-3) {
      // From rest the mesh starts on this icon's grid.
      genieTargets(g, false).forEach((x, i) => {
        vertices[i].set(x, now);
      });
    }
    const rows = genieSprings(g, open, springs);
    genieTargets(g, open).forEach((x, i) => {
      const row = Math.floor(i / 2 / (APP_GENIE.segments + 1));
      vertices[i].to(x, rows[row], now);
    });
    opening = open;
    progress.to(open ? 1 : 0, s, now);
    radius.to(targets.zoom, s, now);
    home.to(open ? springs.home.scale : 1, springs.home.spring, now);
    const { cornerReset } = springs;
    reset = {
      at:
        now +
        (open
          ? Math.max(cornerReset.open - cornerReset.lead, 0)
          : cornerReset.close),
      to: open ? targets.open : targets.close,
      spring: s,
    };
  };

  // The rows can be slower than the crop, so the card has only landed once
  // every spring has.
  const landed = (now: number) =>
    !reset &&
    atRest(progress, now, 1e-3) &&
    atRest(radius, now, 0.5) &&
    vertices.every((vertex) => atRest(vertex, now, 1e-3));

  return {
    get isOpen() {
      return opening;
    },
    show: (now: number) => go(true, now),
    hide: (now: number) => go(false, now),
    /** Puts every spring at rest, open or closed, with no animation. */
    jump(open: boolean, now: number) {
      const g = geometry();
      const targets = cornerTargets(g);
      progress.set(open ? 1 : 0, now);
      radius.set(open ? targets.open : targets.close, now);
      home.set(open ? springs.home.scale : 1, now);
      genieTargets(g, open).forEach((x, i) => {
        vertices[i].set(x, now);
      });
      reset = null;
      opening = open;
    },
    /** The card is at rest, so the icon or the app can take over. */
    landed,
    /** The home screen has stopped scaling too. */
    settled: (now: number) => landed(now) && atRest(home, now, 1e-3),
    sample(now: number) {
      if (reset && now >= reset.at) {
        radius.to(reset.to, reset.spring, reset.at);
        reset = null;
      }
      const g = geometry();
      const p = progress.sample(now).position;
      const frame = card(g, p);
      const values = vertices.map((vertex) => vertex.sample(now).position);
      return {
        progress: p,
        ...frame,
        mesh: appMesh(g, p, values),
        radius: radius.sample(now).position * frame.scale,
        home: home.sample(now).position,
      };
    },
  };
}
