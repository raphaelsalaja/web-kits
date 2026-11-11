// iOS 27's liquid morph, the one a glass button's popover or menu opens with.
// One spring's progress moves the popover out of the button and the button
// down to a quarter of its size, and the content crossfades with a blur.
// Four more parts go out and come back on their own springs: a vertical kick,
// the lens's displacement and blur at the rim, and the blur on the signed
// distance field that joins the two shapes into one. Their springs and timings
// are fitted from the iOS 27.0 Simulator, in scripts/glass/ledger.md.

import { type Spring, spring, uikit } from "../../animation/index.ts";
import { atRest, createFluid } from "../fluid.ts";
import type { Rect } from "../geometry.ts";

const { morph: settings } = uikit;

const sped = (s: Spring) => spring(s.response * settings.speed, s.dampingRatio);

/**
 * Something that goes out to `amount` at `on` and comes back at `off`, seconds
 * after the main spring starts, on its own spring. A few start a few
 * milliseconds before the main spring on iOS; those start with it here and
 * keep their length.
 */
export type Pulse = {
  readonly amount: number;
  readonly on: number;
  readonly off: number;
  readonly spring: Spring;
};

const pulse = (
  amount: number,
  on: number,
  off: number,
  response: number,
  dampingRatio: number,
): Pulse => ({ amount, on, off, spring: spring(response, dampingRatio) });

type Pulses = {
  readonly kick: Pulse;
  readonly sourceKick: Pulse | null;
  readonly lens: Pulse;
  readonly lensBlur: Pulse;
  readonly field: Pulse;
};

export const MORPH = {
  open: {
    main: sped(settings.eject),
    source: sped(settings.blurIn),
    pulses: {
      kick: pulse(-38.05, 0.0067, 0.0878, 0.34, 0.699),
      sourceKick: null,
      lens: pulse(-67.74, 0, 0.0872, 0.421, 0.999),
      lensBlur: pulse(4.78, 0, 0.0896, 0.311, 0.825),
      field: pulse(10_000, 0.0041, 0.0049, 0.663, 0.852),
    } satisfies Pulses,
  },
  close: {
    main: sped(settings.absorb),
    source: sped(settings.absorb),
    pulses: {
      kick: pulse(-89.74, 0, 0.0372, 0.328, 0.855),
      sourceKick: pulse(15.17, 0.0194, 0.1364, 0.494, 0.766),
      lens: pulse(-8.53, 0.0077, 0.0853, 0.281, 0.993),
      lensBlur: pulse(4.82, 0, 0.0834, 0.312, 0.821),
      field: pulse(374.82, 0, 0.0104, 0.441, 0.978),
    } satisfies Pulses,
  },
  /** The button's scale while it's open. */
  intermediate: settings.intermediate,
  /** How much of the way to the popover the button drifts. */
  drift: 0.25,
  /** Points of blur on a fading copy when it's fully faded. */
  contentBlur: 4,
  /**
   * The measured popover's centre is 55.33 pt above the button's. The kicks
   * are scaled by how far this one is, a guess from a single geometry.
   */
  travel: -55.33,
  /** The most the field is ever blurred, in points. */
  field: 20,
  reduceMotion: settings.reduceMotion,
};

export type MorphGeometry = {
  /** The button. */
  source: Rect;
  /** The popover, laid out where it opens. */
  target: Rect;
  /** The label inside the button that the popover grows out of. */
  pivot: Rect;
  /** The button's corner radius at rest. */
  sourceRadius: number;
  /** The popover's corner radius once it's open. */
  targetRadius: number;
};

/** One of the two shapes, as a box around its centre, before its scale. */
export type MorphShape = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  scale: number;
};

export type MorphFrame = {
  /** The main spring, 0 closed and 1 open. It overshoots. */
  progress: number;
  /** The spring that squares the button up. */
  square: number;
  popover: MorphShape;
  source: MorphShape;
  /** The popover's content. The pivot copy shows the rest. */
  opacity: number;
  /** The displacement at the lens's rim, in points. */
  lens: number;
  /** The blur on the content under the lens, in points. */
  lensBlur: number;
  /** The blur on the field that joins the shapes, in points. */
  field: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const centre = (rect: Rect) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});
const clamp = (value: number, low = 0, high = 1) =>
  Math.min(Math.max(value, low), high);

/** The scale the popover starts at: half the pivot's shorter side. */
export function startScale({ target, pivot }: MorphGeometry) {
  return (
    Math.min(pivot.width, pivot.height) /
    2 /
    Math.max(target.width, target.height)
  );
}

/** How much this geometry's kicks are scaled by. */
export function kickScale({ source, target }: MorphGeometry) {
  return clamp((centre(target).y - centre(source).y) / MORPH.travel, -2, 2);
}

type Channels = {
  kick: number;
  sourceKick: number;
  lens: number;
  lensBlur: number;
  field: number;
};

/** Where both shapes are for a progress, a square and the pulses' values. */
export function morphFrame(
  geometry: MorphGeometry,
  progress: number,
  square: number,
  channels: Channels,
): MorphFrame {
  const { source, target, pivot, sourceRadius, targetRadius } = geometry;
  const button = centre(source);
  const from = centre(pivot);
  const to = centre(target);
  // The popover's box grows from a square of its width to its own height,
  // round to begin with and down to its own corner once open.
  const height = lerp(target.width, target.height, progress);
  const side = Math.min(source.width, source.height);
  const width = lerp(source.width, side, square);
  return {
    progress,
    square,
    popover: {
      x: lerp(from.x, to.x, progress),
      y: lerp(from.y, to.y, progress) + channels.kick,
      width: target.width,
      height,
      radius: Math.max(
        lerp(Math.min(target.width, height) / 2, targetRadius, progress),
        0,
      ),
      scale: Math.max(lerp(startScale(geometry), 1, progress), 0),
    },
    source: {
      x: lerp(button.x, to.x, MORPH.drift * progress),
      y: lerp(button.y, to.y, MORPH.drift * progress) + channels.sourceKick,
      width,
      height: source.height,
      radius: lerp(sourceRadius, Math.min(width, source.height) / 2, square),
      scale: Math.max(lerp(1, MORPH.intermediate, progress), 0),
    },
    opacity: clamp(progress),
    lens: channels.lens,
    lensBlur: Math.max(channels.lensBlur, 0),
    field: clamp(channels.field, 0, MORPH.field),
  };
}

/** The blur on a copy fading at `opacity`. */
export const fadeBlur = (opacity: number) =>
  MORPH.contentBlur * (1 - clamp(opacity));

type Event = { at: number; to: number; spring: Spring };

// A fluid that's sent to a list of targets at set times, so a pulse sampled
// late still turns exactly when it was due. `shown` is what's drawn of it,
// which is all that has to settle.
function createChannel(shown = (value: number) => value) {
  const fluid = createFluid(0);
  let events: Event[] = [];
  const advance = (now: number) => {
    while (events.length && events[0].at <= now) {
      const next = events.shift() as Event;
      fluid.to(next.to, next.spring, next.at);
    }
  };
  return {
    play(pulse: Pulse | null, scale: number, now: number) {
      events = [];
      if (!pulse) {
        fluid.to(0, spring(0.3, 1), now);
        return;
      }
      events = [
        { at: now + pulse.on, to: pulse.amount * scale, spring: pulse.spring },
        { at: now + pulse.off, to: 0, spring: pulse.spring },
      ];
    },
    sample(now: number) {
      advance(now);
      return fluid.sample(now).position;
    },
    set(now: number) {
      events = [];
      fluid.set(0, now);
    },
    settled(now: number, epsilon: number) {
      advance(now);
      if (events.length) return false;
      const { position } = fluid.sample(now);
      const drawn = shown(position);
      if (drawn !== position) return Math.abs(drawn) < epsilon;
      return atRest(fluid, now, epsilon);
    },
  };
}

/**
 * The morph's springs, driven by `show` and `hide` from any clock in seconds.
 * Turned round partway, every spring keeps its speed.
 */
export function createMorph(geometry: () => MorphGeometry) {
  const main = createFluid(0);
  const square = createFluid(0);
  const channels = {
    kick: createChannel(),
    sourceKick: createChannel(),
    lens: createChannel(),
    lensBlur: createChannel(),
    field: createChannel((value) => clamp(value, 0, MORPH.field)),
  };
  let open = false;

  const play = (to: boolean, now: number) => {
    open = to;
    const run = to ? MORPH.open : MORPH.close;
    main.to(to ? 1 : 0, run.main, now);
    square.to(to ? 1 : 0, run.source, now);
    const scale = kickScale(geometry());
    channels.kick.play(run.pulses.kick, scale, now);
    channels.sourceKick.play(run.pulses.sourceKick, scale, now);
    channels.lens.play(run.pulses.lens, 1, now);
    channels.lensBlur.play(run.pulses.lensBlur, 1, now);
    channels.field.play(run.pulses.field, 1, now);
  };

  return {
    get isOpen() {
      return open;
    },
    show(now: number) {
      play(true, now);
    },
    hide(now: number) {
      play(false, now);
    },
    /** At rest at either end, with nothing moving. */
    jump(to: boolean, now: number) {
      open = to;
      main.set(to ? 1 : 0, now);
      square.set(to ? 1 : 0, now);
      for (const channel of Object.values(channels)) channel.set(now);
    },
    sample(now: number): MorphFrame {
      return morphFrame(
        geometry(),
        main.sample(now).position,
        square.sample(now).position,
        {
          kick: channels.kick.sample(now),
          sourceKick: channels.sourceKick.sample(now),
          lens: channels.lens.sample(now),
          lensBlur: channels.lensBlur.sample(now),
          field: channels.field.sample(now),
        },
      );
    },
    /**
     * Both springs within a thousandth of the way, and every pulse within a
     * twentieth of a point of nothing, and still.
     */
    landed(now: number) {
      return (
        atRest(main, now, 1e-3) &&
        atRest(square, now, 1e-3) &&
        Object.values(channels).every((channel) => channel.settled(now, 0.05))
      );
    },
  };
}

export type Morph = ReturnType<typeof createMorph>;
