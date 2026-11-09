import type { Rect } from "../geometry.ts";
import { type Edge, genieMesh, type Mesh } from "./mesh.ts";
import { createShadow } from "./shadow.ts";
import { createSlices } from "./slices.ts";

export type GenieLayerOptions = {
  /** The window being minimised. */
  source: HTMLElement;
  /** Where it goes, like a Dock tile. */
  target: HTMLElement;
  /**
   * The screen. The funnel is clipped to it, like the display edge clips it
   * on a Mac. Defaults to the viewport. Must be positioned.
   */
  bounds?: HTMLElement | null;
  /** The side of the screen the Dock is on. */
  edge?: Edge;
  /**
   * CSS pixels per macOS point. The Dock's thresholds are in points, so a
   * scaled-down desktop needs this to bend like a full-size one.
   */
  scale?: number;
  /**
   * Fades the window out over the second half of the run. The Dock doesn't,
   * the window only passes under its glass, so this is off by default.
   */
  fade?: boolean;
  /** Blurs the window over the second half of the run. Off by default. */
  blur?: boolean;
  /**
   * Cuts the window off at the target's near edge, for a target with nothing
   * drawn over it. In the Dock the glass covers the window instead. On
   * whenever it fades or blurs.
   */
  clip?: boolean;
};

export type GenieLayer = ReturnType<typeof createGenie>;

// Progress 0 hides the layer, so a run in flight never draws below this or
// the window blinks out for a frame.
export const IN_FLIGHT = 1e-4;

// Below this progress the copies fade in over the real window, which stays
// visible underneath, so the switch from live window to copies is a blend
// rather than a cut. The corners have only bent a few points by then.
export const HANDOFF = 0.04;

// The blur at the end of the run, in points.
const BLUR = 24;

// How far past the target's near edge a clipped window takes to dissolve, in
// points. It tucks under the target's edge rather than stopping on it.
const DISSOLVE = 12;

function relative(element: HTMLElement, bounds: HTMLElement | null): Rect {
  const box = element.getBoundingClientRect();
  if (!bounds)
    return { x: box.left, y: box.top, width: box.width, height: box.height };
  const outer = bounds.getBoundingClientRect();
  return {
    x: box.left - outer.left - bounds.clientLeft,
    y: box.top - outer.top - bounds.clientTop,
    width: box.width,
    height: box.height,
  };
}

// Full until halfway, then eased out so it's gone just as it reaches the icon.
export function genieOpacity(progress: number) {
  const t = Math.min(Math.max((progress - 0.5) / 0.5, 0), 1);
  return 1 - t * t * (3 - 2 * t);
}

// Fades the layer out just inside the target's near edge and hides it beyond,
// so the window never shows past the target. Nothing if they overlap.
function dissolve(
  window: Rect,
  icon: Rect,
  edge: Edge,
  ramp: number,
  width: number,
  height: number,
) {
  const [direction, start, clear] =
    edge === "bottom"
      ? ["bottom", icon.y, window.y + window.height]
      : edge === "top"
        ? ["top", height - icon.y - icon.height, height - window.y]
        : edge === "right"
          ? ["right", icon.x, window.x + window.width]
          : ["left", width - icon.x - icon.width, width - window.x];
  if (clear >= start) return "";
  return `linear-gradient(to ${direction}, #000 ${start}px, transparent ${start + ramp}px)`;
}

const divide = (rect: Rect, by: number): Rect => ({
  x: rect.x / by,
  y: rect.y / by,
  width: rect.width / by,
  height: rect.height / by,
});

function scaled(mesh: Mesh, by: number): Mesh {
  if (by === 1) return mesh;
  const points = mesh.points.map((value) => value * by);
  return { ...mesh, points };
}

export function createGenie({
  source,
  target,
  bounds = null,
  edge = "bottom",
  scale = 1,
  fade = false,
  blur = false,
  clip = fade || blur,
}: GenieLayerOptions) {
  // The computed size ignores transforms, so a scaled window still maps its
  // full box, and unlike offsetWidth it isn't rounded, so the copies lay out
  // exactly like the window.
  const computed = getComputedStyle(source);
  const width = Number.parseFloat(computed.width) || source.offsetWidth;
  const height = Number.parseFloat(computed.height) || source.offsetHeight;
  const from = relative(source, bounds);
  const frame = { ...from, width, height };
  const icon = relative(target, bounds);
  let windowPoints = divide(frame, scale);
  let iconPoints = divide(icon, scale);

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("data-genie", "");
  // Inside bounds the layer stacks after its siblings, so overlays can sit
  // above it. On the viewport it goes over everything.
  Object.assign(layer.style, {
    position: bounds ? "absolute" : "fixed",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: bounds ? "auto" : "2147483647",
  });
  (bounds ?? document.body).append(layer);
  const mask = () => {
    if (!clip) return;
    layer.style.maskImage = dissolve(
      frame,
      icon,
      edge,
      DISSOLVE * scale,
      bounds?.clientWidth ?? window.innerWidth,
      bounds?.clientHeight ?? window.innerHeight,
    );
  };
  mask();

  const part = () => {
    const element = document.createElement("div");
    Object.assign(element.style, { position: "absolute", inset: "0" });
    layer.append(element);
    return element;
  };
  // The window keeps its own shadow until the handoff ends, so the drawn one
  // waits rather than doubling it.
  const under = part();
  const over = part();
  const shadow = createShadow(under, source, width, height);
  const slices = createSlices(over, source, width, height);
  let disposed = false;

  // Returns the mesh it drew, if any.
  function draw(progress: number): Mesh | null {
    if (disposed) return null;
    // At 1 the window is wholly inside the target, so there's nothing to draw.
    const shown = progress > 0 && progress < 1;
    layer.style.display = shown ? "block" : "none";
    if (!shown) return null;
    layer.style.opacity = fade ? `${genieOpacity(progress)}` : "";
    layer.style.filter = blur
      ? `blur(${(1 - genieOpacity(progress)) * BLUR * scale}px)`
      : "";
    const mesh = scaled(
      genieMesh(progress, windowPoints, iconPoints, edge),
      scale,
    );
    under.style.visibility = progress < HANDOFF ? "hidden" : "";
    over.style.opacity = progress < HANDOFF ? `${progress / HANDOFF}` : "";
    shadow.draw(mesh);
    slices.draw(mesh);
    return mesh;
  }

  return {
    window: frame,
    icon,
    draw,
    /** Measures the window and the target again, in case either has moved. */
    place() {
      const to = relative(source, bounds);
      const into = relative(target, bounds);
      if (
        to.x === frame.x &&
        to.y === frame.y &&
        into.x === icon.x &&
        into.y === icon.y
      )
        return;
      Object.assign(frame, { x: to.x, y: to.y });
      Object.assign(icon, { x: into.x, y: into.y });
      windowPoints = divide(frame, scale);
      iconPoints = divide(icon, scale);
      mask();
    },
    meshAt(progress: number) {
      return scaled(genieMesh(progress, windowPoints, iconPoints, edge), scale);
    },
    dispose() {
      disposed = true;
      shadow.dispose();
      slices.dispose();
      layer.remove();
    },
  };
}
