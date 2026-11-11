import type { Effect, ElementSource, ReducedMotion } from "./dom.ts";
import {
  type GenieControllerOptions,
  genieController,
} from "./genie/controller.ts";
import {
  type LaunchControllerOptions,
  type LaunchFrame,
  launchController,
} from "./launch/controller.ts";
import {
  type MorphControllerOptions,
  morphController,
} from "./morph/controller.ts";
import type { MorphFrame } from "./morph/glass.ts";

type Shared =
  | "target"
  | "bounds"
  | "hideTarget"
  | "reducedMotion"
  | "speed"
  | "debug"
  | "open"
  | "onStart"
  | "onFrame"
  | "onLand";

/** `launch()`'s own options. */
export type LaunchOptions = Omit<LaunchControllerOptions, Shared>;
/** `genie()`'s own options. */
export type GenieOptions = Omit<GenieControllerOptions, Shared>;
/** `morph()`'s own options. */
export type MorphOptions = Omit<MorphControllerOptions, Shared>;

export type LaunchEffect = {
  readonly kind: "launch";
  readonly options: LaunchOptions;
};
export type GenieEffect = {
  readonly kind: "genie";
  readonly options: GenieOptions;
};
export type MorphEffect = {
  readonly kind: "morph";
  readonly options: MorphOptions;
};
export type OriginEffect = LaunchEffect | GenieEffect | MorphEffect;

/**
 * Opens out of `from` the way SpringBoard opens an app, with every vertex of
 * the card on its own spring, and closes back into it.
 */
export const launch = (options: LaunchOptions = {}): LaunchEffect => ({
  kind: "launch",
  options,
});

/** Minimises into `from` the way the Dock does, and brings it back out. */
export const genie = (options: GenieOptions = {}): GenieEffect => ({
  kind: "genie",
  options,
});

/**
 * Morphs out of `from` the way iOS 27 opens a glass button's popover or menu,
 * through one liquid shape, and absorbs back into it.
 */
export const morph = (options: MorphOptions = {}): MorphEffect => ({
  kind: "morph",
  options,
});

/**
 * How far open it is, from 0 to 1. Launch's frames also carry the card's
 * rect, corner radius, mesh and home scale, and the morph's both shapes and
 * its pulses.
 */
export type OriginFrame = { progress: number } & Partial<
  Omit<LaunchFrame, "progress">
> &
  Partial<Omit<MorphFrame, "progress">>;

export type OriginOptions = {
  /** The element it opens out of and closes back into, like an icon. */
  from: ElementSource;
  /**
   * `launch()`, `genie()` or `morph()`. A new kind of effect applies from the
   * next run.
   */
  effect: OriginEffect;
  /** The positioned element the copies are drawn in. Defaults to the viewport. */
  bounds?: ElementSource;
  /**
   * Hides `from` while it's open. Launch does by default, like an icon under
   * its app, and so does the morph, which absorbs the button. The genie
   * doesn't, like a Dock tile.
   */
  hideTarget?: boolean;
  reducedMotion?: ReducedMotion;
  /**
   * Plays slower or faster, like the Simulator's Slow Animations. 0.1 is ten
   * times slower. It changes a run that's already going.
   */
  speed?: number;
  /** Draws the mesh: its pieces in blue and its vertices in orange. */
  debug?: boolean;
  /** Starts open, with no animation. Closed by default, and hidden. */
  open?: boolean;
  onStart?: (open: boolean) => void;
  onFrame?: (frame: OriginFrame) => void;
  /** Called once it's landed open or closed. */
  onLand?: (open: boolean) => void;
};

export type Origin = Effect & {
  /** Changes options. A new grid or springs apply from the next run. */
  set(options: Partial<OriginOptions>): void;
};

type Controller = Effect & { set(options: object): void };

/**
 * Opens `element` out of `from` and closes it back in. While the copies are
 * drawn, an animation on the element holds it hidden until they land, so
 * anything that waits on the element's animations, like Base UI's exit,
 * waits for them.
 */
export function origin(element: HTMLElement, initial: OriginOptions): Origin {
  let options = initial;
  let running = false;
  let kind = options.effect.kind;
  let sent: Record<string, unknown> = {};

  const callbacks = {
    onStart: (open: boolean) => {
      running = true;
      options.onStart?.(open);
    },
    onLand: (open: boolean) => {
      running = false;
      options.onLand?.(open);
    },
  };

  const shared = () => ({
    target: options.from,
    bounds: options.bounds,
    hideTarget: options.hideTarget,
    reducedMotion: options.reducedMotion,
    speed: options.speed,
    debug: options.debug,
  });
  const settings = (): Record<string, unknown> => ({
    ...options.effect.options,
    ...shared(),
  });

  const create = (open: boolean): Controller => {
    sent = settings();
    const start = { ...sent, ...callbacks, open };
    if (kind === "genie") {
      return genieController(element, {
        ...(start as GenieControllerOptions),
        // The genie counts how far minimised it is.
        onFrame: (progress) => options.onFrame?.({ progress: 1 - progress }),
      });
    }
    if (kind === "morph") {
      return morphController(element, {
        ...(start as MorphControllerOptions),
        onFrame: (frame) => options.onFrame?.(frame),
      });
    }
    return launchController(element, {
      ...(start as LaunchControllerOptions),
      onFrame: (frame) => options.onFrame?.(frame),
    });
  };

  let controller = create(options.open ?? false);

  // A different kind of effect takes over between runs, from wherever the
  // last one left the element.
  const settle = () => {
    if (running || kind === options.effect.kind) return;
    const open = controller.isOpen;
    controller.destroy();
    kind = options.effect.kind;
    controller = create(open);
  };

  return {
    get isOpen() {
      return controller.isOpen;
    },
    open({ instant = false } = {}) {
      settle();
      if (instant) running = false;
      controller.open({ instant });
    },
    close({ instant = false } = {}) {
      settle();
      if (instant) running = false;
      controller.close({ instant });
    },
    toggle() {
      settle();
      controller.toggle();
    },
    set(next) {
      options = { ...options, ...next };
      settle();
      // Mid-run, the effect playing keeps its own options until it lands.
      if (kind !== options.effect.kind) {
        controller.set(shared());
        return;
      }
      const current = settings();
      // An option the last effect had and this one doesn't goes back to its
      // default.
      const cleared = Object.fromEntries(
        Object.keys(sent)
          .filter((key) => !(key in current))
          .map((key) => [key, undefined]),
      );
      sent = current;
      controller.set({ ...cleared, ...current });
    },
    destroy() {
      controller.destroy();
    },
  };
}
