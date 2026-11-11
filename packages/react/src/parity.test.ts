import { describe, expect, it } from "vitest";
import familyFixture from "./fixtures/family.json";
import swiftuiFixture from "./fixtures/swiftui.json";
import { animations, family, numericText } from "./internal/presets.ts";
import { physics, type Spring, settle, value } from "./springs.ts";

type Layer = { dy: number; alpha: number; scale: number; blur: number };
type Frame = { t: number; old: Layer | null; new: Layer | null };

const scenarios = swiftuiFixture.scenarios as Record<
  string,
  { size: number; frames: Frame[] }
>;

/** The smallest RMS error over start times within 50 ms of the change. */
function rms(
  samples: { t: number; y: number }[],
  model: (t: number) => number,
  window = 0.05,
) {
  let best = Number.POSITIVE_INFINITY;
  for (let t0 = -window; t0 <= window; t0 += 0.001) {
    const error =
      samples.reduce((sum, { t, y }) => sum + (model(t - t0) - y) ** 2, 0) /
      samples.length;
    best = Math.min(best, Math.sqrt(error));
  }
  return best;
}

const progress = (s: Spring) => (t: number) => (t <= 0 ? 0 : value(s, t));

function series(name: string, layer: "old" | "new", key: keyof Layer) {
  return scenarios[name].frames.flatMap((frame) => {
    const found = frame[layer];
    return found ? [{ t: frame.t, y: found[key] }] : [];
  });
}

describe("numericText", () => {
  it("settles on the durations RenderBox is given", () => {
    expect(settle(numericText.fade)).toBeCloseTo(0.5, 2);
    expect(settle(numericText.move)).toBeCloseTo(0.8, 1);
  });

  it("keeps the decoded mass, stiffness and damping", () => {
    const fade = physics(numericText.fade, 1);
    expect(fade.stiffness).toBeCloseTo(344, 6);
    expect(fade.damping).toBeCloseTo(37, 6);
    const move = physics(numericText.move, 2);
    expect(move.stiffness).toBeCloseTo(470, 6);
    expect(move.damping).toBeCloseTo(34, 6);
  });

  const fade = progress(numericText.fade);
  const move = progress(numericText.move);

  for (const name of [
    "numericValue-0-1-default",
    "numericValue-0-1-linear1",
    "numeric-up-0-1",
    "numeric-down-0-1",
  ]) {
    const sign = name.includes("down") ? -1 : 1;

    it(`moves, fades, shrinks and blurs the old digit like ${name}`, () => {
      const offset = numericText.offset;
      expect(
        rms(series(name, "old", "dy"), (t) => -sign * offset * move(t)),
      ).toBeLessThan(0.01);
      expect(
        rms(series(name, "old", "alpha"), (t) =>
          Math.max(1 - numericText.fadeOut * fade(t), 0),
        ),
      ).toBeLessThan(0.025);
      expect(
        rms(
          series(name, "old", "scale"),
          (t) => 1 - (1 - numericText.scale) * fade(t),
        ),
      ).toBeLessThan(0.02);
      expect(
        rms(series(name, "old", "blur"), (t) => numericText.blur * fade(t)),
      ).toBeLessThan(0.012);
    });

    it(`brings the new digit in like ${name}`, () => {
      const offset = numericText.offset;
      expect(
        rms(series(name, "new", "dy"), (t) => sign * offset * (1 - move(t))),
      ).toBeLessThan(0.01);
      expect(rms(series(name, "new", "alpha"), fade)).toBeLessThan(0.01);
      expect(
        rms(
          series(name, "new", "scale"),
          (t) => numericText.scale + (1 - numericText.scale) * fade(t),
        ),
      ).toBeLessThan(0.012);
    });
  }
});

describe("opacity", () => {
  it("fades the new label in on the default animation", () => {
    expect(
      rms(series("opacity-craft", "new", "alpha"), progress(animations.smooth)),
    ).toBeLessThan(0.01);
  });
});

describe("Family", () => {
  const { fitted } = familyFixture;
  const response = (stiffness: number) => (2 * Math.PI) / Math.sqrt(stiffness);

  it("types digits in from below on the keypad's spring", () => {
    const enter = progress(family.input.enter);
    for (const { samples } of familyFixture.keypad.enter) {
      const peak = samples.reduce(
        (top, s, i) => (s.y > samples[top].y ? i : top),
        0,
      );
      expect(
        rms(
          samples.slice(peak),
          (t) => family.input.enterOffset * (1 - enter(t)),
          0.1,
        ),
      ).toBeLessThan(0.006);
    }
  });

  it("uses the fitted springs", () => {
    const cases: [Spring, { stiffness: number; dampingRatio: number }][] = [
      [family.input.enter, fitted.keypad.enter.spring],
      [family.input.exit, fitted.keypad.exit.spring],
      [family.input.slide, fitted.keypad.slide.spring],
      [family.wheel, fitted.odometer.wheel.spring],
      [family.layout, fitted.odometer.layout.spring],
      [family.input.push, fitted.keypad.push.spring],
    ];
    for (const [spring, fit] of cases) {
      expect(spring.response).toBeCloseTo(response(fit.stiffness), 6);
      expect(spring.dampingRatio).toBe(fit.dampingRatio);
    }
    expect(family.input.enterOffset).toBe(fitted.keypad.enter.travel);
    expect(family.input.exitOffset).toBe(fitted.keypad.exit.travel);
    expect(family.input.pushOffset).toBe(fitted.keypad.push.travel);
  });

  it("matches the fitted durations, which SwiftUI calls the response", () => {
    expect(family.wheel.response).toBeCloseTo(
      fitted.odometer.wheel.spring.duration,
      2,
    );
    expect(family.layout.response).toBeCloseTo(
      fitted.odometer.layout.spring.duration,
      2,
    );
    expect(family.input.enter.response).toBeCloseTo(
      fitted.keypad.enter.spring.duration,
      2,
    );
    expect(family.input.slide.response).toBeCloseTo(
      fitted.keypad.slide.spring.duration,
      2,
    );
  });
});
