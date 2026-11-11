import { springboard } from "../../animation/index.ts";
import { createOverlay, gridLines, type Overlay } from "../debug.ts";
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
import { drawMesh } from "./tiles.ts";
import {
  type AppGeometry,
  type AppSprings,
  createAppTransition,
  meshPoint,
} from "./transition.ts";

export type LaunchFrame = ReturnType<
  ReturnType<typeof createAppTransition>["sample"]
>;

export type LaunchControllerOptions = {
  /** The element the popup opens out of and closes back into, like an icon. */
  target: ElementSource;
  /** The positioned element the popup sits in. Defaults to the viewport. */
  bounds?: ElementSource;
  /**
   * Tiles across and down the card. A popup is much smaller than a phone
   * screen, so it needs a finer grid than SpringBoard's for the slant to
   * change smoothly across it.
   */
  grid?: { columns: number; rows: number };
  /**
   * `in` is the seconds the card takes to fade from the target to the popup
   * on the way out. `out` is how much of the way back it takes to fade back.
   * Without `hideTarget` the card is the popup the whole way, and fades in
   * and out on its own.
   */
  fade?: { in?: number; out?: number };
  /** Hides the target while the popup's open, like an icon under its app. */
  hideTarget?: boolean;
  /** Springs for the card, the corners and `home`. SpringBoard's by default. */
  springs?: Partial<AppSprings>;
  /** An element behind the popup that recedes like the home screen. */
  home?: ElementSource;
  reducedMotion?: ReducedMotion;
  /**
   * Plays slower or faster, like the Simulator's Slow Animations. 0.1 is ten
   * times slower. It changes a run that's already going.
   */
  speed?: number;
  /** Draws the mesh: its tiles in blue and the springs' vertices in orange. */
  debug?: boolean;
  /** Starts open, with no animation. Closed by default, and hidden. */
  open?: boolean;
  onStart?: (open: boolean) => void;
  onFrame?: (frame: LaunchFrame) => void;
  /** Called once the card has landed and the popup or the target is back. */
  onLand?: (open: boolean) => void;
};

export type LaunchController = Effect & {
  /** Changes options. A new grid or springs apply from the next run. */
  set(options: Partial<LaunchControllerOptions>): void;
};

// Outlasts any of SpringBoard's springs. The clock is finished early, the
// moment the card lands.
const HOLD = 10_000;

// The close spring takes about 0.15 seconds over the last fifth of the way.
const FADE_OUT = 0.2;

// The open spring covers the first fifth of the way in about 30 ms, so the
// fade in is timed rather than tied to the way, to fade as slowly as it fades
// back.
const FADE_IN = 0.15;

// The springs take a few hundred milliseconds more to come to rest than to
// stop visibly moving, so the card lands once no vertex moves faster than
// this, in pixels per second: a twentieth of a pixel a frame at 60 Hz.
const REST = 3;

const GRID = { columns: 12, rows: 8 };

/**
 * Opens `element` out of `target` the way SpringBoard opens an app, and
 * closes it back in. Every vertex of the card has its own spring. While the
 * card is drawn, an animation on the element holds it hidden, and that
 * animation finishes the moment the card lands, so anything that waits on the
 * element's animations, like Base UI's exit, waits for the card.
 */
export function launchController(
  element: HTMLElement,
  initial: LaunchControllerOptions,
): LaunchController {
  let options = initial;
  let isOpen = options.open ?? false;
  // Without a transition the springs are at rest at this end.
  let resting = isOpen;
  let geometry: AppGeometry;
  let transition: ReturnType<typeof createAppTransition> | null = null;
  let card: Card | null = null;
  let overlay: Overlay | null = null;
  let clock: Animation | null = null;
  let frame = 0;
  let homeFrame = 0;
  // How far the card has faded from the target to the popup.
  let fade = isOpen ? 1 : 0;
  const target = createHider();
  const home = createHome();

  const springs = (): AppSprings => ({ ...springboard, ...options.springs });
  const speed = () => options.speed ?? 1;
  const time = createClock(speed);
  // The element's animations run at the same speed, so the hold outlasts a
  // slowed card and the reduced fade slows with it.
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
    card?.dispose();
    card = null;
    overlay?.dispose();
    overlay = null;
  };

  // Hidden, and done, so nothing waiting on the element's animations waits.
  const conceal = () => {
    clock = element.animate(
      { opacity: [0, 0] },
      { duration: 0, fill: "forwards" },
    );
  };

  const jump = (to: boolean) => {
    stop();
    release();
    cancelAnimationFrame(homeFrame);
    transition = null;
    resting = to;
    isOpen = to;
    fade = to ? 1 : 0;
    const tile = resolve(options.target);
    if (to && tile && options.hideTarget !== false) target.hide(tile);
    else target.reveal();
    home.set(resolve(options.home), to ? springs().home.scale : null);
    if (!to) conceal();
  };

  const play = (to: boolean) => {
    isOpen = to;
    stop();
    const tile = resolve(options.target);

    if (reduced(options.reducedMotion) || !tile) {
      release();
      cancelAnimationFrame(homeFrame);
      transition = null;
      resting = to;
      fade = to ? 1 : 0;
      home.set(resolve(options.home), null);
      const current = animate(
        [{ opacity: to ? 0 : 1 }, { opacity: to ? 1 : 0 }],
        { duration: 200, easing: "ease", fill: to ? "none" : "forwards" },
      );
      clock = current;
      options.onStart?.(to);
      if (to && tile && options.hideTarget !== false) target.hide(tile);
      current.finished.then(
        () => {
          if (clock !== current) return;
          if (!to) target.reveal();
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

    const begin = () => {
      if (clock !== current) return;
      if (!card) {
        card = createCard(
          element,
          tile,
          resolve(options.bounds),
          options.grid ?? GRID,
        );
        geometry = card.geometry;
        // A fresh card only starts at rest, so springs set since the last
        // run take over here without losing any speed.
        transition = createAppTransition(() => geometry, springs());
        transition.jump(resting, time());
      }
      const run = transition as NonNullable<typeof transition>;
      const drawn = card;
      const backdrop = resolve(options.home);
      if (to) run.show(time());
      else run.hide(time());

      // With the target left showing there's nothing to fade from, so the
      // card is the popup the whole way and fades on its own.
      const morph = options.hideTarget !== false;
      if (morph) target.hide(tile);
      options.onStart?.(to);
      const fadeIn = options.fade?.in ?? FADE_IN;
      const fadeOut = options.fade?.out ?? FADE_OUT;
      const from = { fade, at: time() };
      const goal = to ? 1 : 0;
      const corner = to ? geometry.screenRadius : geometry.iconRadius;
      let last: { at: number; mesh: LaunchFrame["mesh"] } | null = null;

      // The home screen's spring is slower than the card's, so it keeps going
      // after the card lands.
      const recede = () => {
        const now = time();
        home.set(backdrop, run.sample(now).home);
        if (run.settled(now)) {
          if (!to) home.set(backdrop, null);
          return;
        }
        homeFrame = requestAnimationFrame(recede);
      };

      const tick = () => {
        if (clock !== current) return;
        const now = time();
        // A positioner can place the popup a frame after it mounts, so the
        // springs head for wherever it is now.
        if (drawn.place()) {
          if (to) run.show(now);
          else run.hide(now);
        }
        const sampled = run.sample(now);
        fade = to
          ? Math.min(from.fade + (now - from.at) / fadeIn, 1)
          : Math.min(from.fade, Math.max(sampled.progress / fadeOut, 0));
        drawn.draw(sampled, fade, morph);
        if (options.debug) {
          overlay ??= createOverlay(resolve(options.bounds));
          overlay.draw(drawn.lines(sampled), sampled.mesh);
        } else {
          overlay?.dispose();
          overlay = null;
        }
        home.set(backdrop, sampled.home);
        options.onFrame?.(sampled);
        const still =
          last !== null &&
          now > last.at &&
          Math.abs(sampled.progress - goal) < 2e-3 &&
          Math.abs(sampled.radius - corner) < 0.5 &&
          moved(last.mesh, sampled.mesh) / (now - last.at) < REST;
        last = { at: now, mesh: sampled.mesh };
        if ((still || run.landed(now)) && (!to || fade === 1)) {
          fade = goal;
          resting = to;
          release();
          if (!to) target.reveal();
          current.finish();
          if (backdrop) recede();
          options.onLand?.(to);
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(homeFrame);
      tick();
    };

    // Copying the popup a hundred times is slow, so a fresh card waits a
    // frame rather than adding to the work of the press that opened it. The
    // target stays in place until then.
    if (card) begin();
    else frame = requestAnimationFrame(begin);
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
      cancelAnimationFrame(homeFrame);
      release();
      target.reveal();
      home.set(null, null);
    },
  };
}

type Card = ReturnType<typeof createCard>;

function moved(from: LaunchFrame["mesh"], to: LaunchFrame["mesh"]) {
  let most = 0;
  from.forEach((vertex, index) => {
    most = Math.max(
      most,
      Math.abs(to[index].x - vertex.x),
      Math.abs(to[index].y - vertex.y),
    );
  });
  return most;
}

const radius = (element: HTMLElement) =>
  Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;

// Scales one element at a time, and puts back the scale it had before.
function createHome() {
  let scaled: { element: HTMLElement; scale: string } | null = null;
  return {
    set(element: HTMLElement | null, scale: number | null) {
      if (scaled && (scaled.element !== element || scale === null)) {
        scaled.element.style.scale = scaled.scale;
        scaled = null;
      }
      if (!element || scale === null) return;
      scaled ??= { element, scale: element.style.scale };
      element.style.scale = `${scale}`;
    },
  };
}

// A copy of the popup per tile of the mesh, cropped and clipped like
// SpringBoard's card, on a layer over everything else in `bounds`. Each tile
// also has a copy of the target under the popup's, to fade from like the icon
// on the home screen.
function createCard(
  source: HTMLElement,
  target: HTMLElement,
  bounds: HTMLElement | null,
  grid: { columns: number; rows: number },
) {
  // The computed size ignores transforms and isn't rounded, so the copies lay
  // out exactly like the popup.
  const computed = getComputedStyle(source);
  const width = Number.parseFloat(computed.width) || source.offsetWidth;
  const height = Number.parseFloat(computed.height) || source.offsetHeight;
  const geometry: AppGeometry = {
    icon: relative(target, bounds),
    screen: { ...relative(source, bounds), width, height },
    iconRadius: radius(target),
    screenRadius: radius(source),
  };

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("data-launch", "");
  Object.assign(layer.style, {
    position: bounds ? "absolute" : "fixed",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: bounds ? "auto" : "2147483647",
  });
  (bounds ?? document.body).append(layer);

  const copy = cloneWindow(source, width, height);
  const { icon } = geometry;
  const scale = width / icon.width;
  const face = cloneWindow(target, icon.width, icon.height);
  face.style.setProperty("transform-origin", "0 0");
  const parts = Array.from({ length: grid.columns * grid.rows }, () => {
    const tile = document.createElement("div");
    Object.assign(tile.style, {
      position: "absolute",
      top: "0",
      left: "0",
      overflow: "hidden",
      transformOrigin: "0 0",
      backfaceVisibility: "hidden",
    });
    const crop = document.createElement("div");
    Object.assign(crop.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: `${width}px`,
      overflow: "hidden",
    });
    const under = face.cloneNode(true) as HTMLElement;
    const over = copy.cloneNode(true) as HTMLElement;
    crop.append(under, over);
    tile.append(crop);
    layer.append(tile);
    return { tile, crop, under, over };
  });
  const tiles = parts.map((part) => part.tile);
  let drawnFade = -1;

  return {
    geometry,
    // Every value is written straight onto the elements that use it. As
    // inherited custom properties on the layer they'd restyle every node in
    // every copy, every frame.
    draw(frame: LaunchFrame, fade: number, morph: boolean) {
      const corner = frame.radius / frame.scale;
      const crop = `${frame.layerHeight}px`;
      const clip = `path("${continuousRect(width, frame.layerHeight, corner)}")`;
      const shift = `0 ${(frame.layerHeight - height) / 2}px`;
      const lift = (frame.layerHeight - icon.height * scale) / 2;
      const grown = `translateY(${lift}px) scale(${scale})`;
      for (const part of parts) {
        part.crop.style.height = crop;
        part.crop.style.clipPath = clip;
        part.over.style.translate = shift;
        // Once the popup's copy is opaque the target's under it can't be seen.
        if (morph && fade < 1) part.under.style.transform = grown;
        if (fade !== drawnFade) {
          part.over.style.opacity = morph ? `${fade}` : "";
          part.under.style.visibility = morph && fade < 1 ? "" : "hidden";
        }
      }
      // Faded tile by tile, the seams where tiles overlap would show.
      if (fade !== drawnFade) layer.style.opacity = morph ? "" : `${fade}`;
      drawnFade = fade;
      drawMesh(
        tiles,
        frame.mesh,
        width,
        frame.layerHeight,
        grid.columns,
        grid.rows,
      );
    },
    /** The tiles' edges, through the points the tiles are drawn onto. */
    lines(frame: LaunchFrame) {
      const points = [];
      for (let r = 0; r <= grid.rows; r++) {
        for (let c = 0; c <= grid.columns; c++) {
          points.push(meshPoint(frame.mesh, c / grid.columns, r / grid.rows));
        }
      }
      return gridLines(points, grid.columns);
    },
    /** Measures the popup and the target again, and says if either moved. */
    place() {
      const screen = relative(source, bounds);
      const into = relative(target, bounds);
      const { screen: was, icon: before } = geometry;
      if (
        screen.x === was.x &&
        screen.y === was.y &&
        into.x === before.x &&
        into.y === before.y
      )
        return false;
      Object.assign(was, { x: screen.x, y: screen.y });
      Object.assign(before, { x: into.x, y: into.y });
      return true;
    },
    dispose() {
      layer.remove();
    },
  };
}
