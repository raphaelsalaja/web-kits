import { describe, expect, it } from "vitest";
import { toLinear, toMotion, tween } from "./convert.ts";
import { CURVES } from "./curve.ts";
import { swiftui } from "./presets.ts";
import { physics, settle, spring } from "./spring.ts";

describe("toMotion", () => {
  it("keeps the spring's physics", () => {
    const { mass, stiffness, damping } = physics(swiftui.snappy);
    const motion = toMotion(swiftui.snappy);
    expect(motion.type).toBe("spring");
    expect(motion.mass).toBeCloseTo(mass);
    expect(motion.stiffness).toBeCloseTo(stiffness);
    expect(motion.damping).toBeCloseTo(damping);
  });

  it("plays slower below speed 1", () => {
    const slow = toMotion(spring(0.5, 1), 0.5);
    const expected = physics(spring(1, 1));
    expect(slow.stiffness).toBeCloseTo(expected.stiffness);
    expect(slow.damping).toBeCloseTo(expected.damping);
  });

  it("scales the initial velocity with the speed", () => {
    expect(toMotion(swiftui.smooth, 2, 3).velocity).toBe(6);
    expect("velocity" in toMotion(swiftui.smooth)).toBe(false);
  });
});

describe("tween", () => {
  it("carries the curve and only a real delay", () => {
    expect(tween(0.35, CURVES.easeInEaseOut)).toEqual({
      duration: 0.35,
      ease: [...CURVES.easeInEaseOut],
    });
    expect(tween(0.35, CURVES.easeInEaseOut, 0.1).delay).toBe(0.1);
  });
});

describe("toLinear", () => {
  it("runs from 0 to 1 over the settling time", () => {
    const { easing, duration } = toLinear(swiftui.smooth);
    const points = easing.slice(7, -1).split(", ").map(Number);
    expect(points[0]).toBe(0);
    expect(points.at(-1)).toBe(1);
    expect(duration).toBe(Math.round(settle(swiftui.smooth) * 1000));
  });
});
