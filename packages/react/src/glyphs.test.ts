import { describe, expect, it } from "vitest";
import {
  byDiff,
  byPlace,
  byTyping,
  lcs,
  type Part,
} from "./internal/glyphs.ts";

const en = (options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("en-US", options);

const keyed = (parts: Part[]) =>
  parts.map((part) => `${part.key}=${part.char}`);

describe("byPlace", () => {
  it("keys digits by their place", () => {
    expect(keyed(byPlace(en().formatToParts(9)))).toEqual(["i0=9"]);
    expect(keyed(byPlace(en().formatToParts(10)))).toEqual(["i1=1", "i0=0"]);
  });

  it("keys separators by the digits to their right", () => {
    expect(
      keyed(
        byPlace(
          en({ style: "currency", currency: "EUR" }).formatToParts(1502.75),
        ),
      ),
    ).toEqual([
      "currency0:0=€",
      "i3=1",
      "g3=,",
      "i2=5",
      "i1=0",
      "i0=2",
      "d=.",
      "f0=7",
      "f1=5",
    ]);
  });

  it("keeps the currency sign across values", () => {
    const format = en({ style: "currency", currency: "EUR" });
    expect(byPlace(format.formatToParts(0.21))[0].key).toBe(
      byPlace(format.formatToParts(502.75))[0].key,
    );
  });
});

describe("byTyping", () => {
  it("keeps typed digits and the group separator they move past", () => {
    const first = byTyping([], en().formatToParts(1234), 1);
    const second = byTyping(first, en().formatToParts(12345), 2);
    expect(
      second
        .filter((p) => p.role === "digit")
        .slice(0, 4)
        .map((p) => p.key),
    ).toEqual(first.filter((p) => p.role === "digit").map((p) => p.key));
    expect(first.find((p) => p.role === "group")?.key).toBe("group@-3");
    expect(second.find((p) => p.role === "group")?.key).toBe("group@-3");
  });

  it("gives a separator for a new group a new key", () => {
    const first = byTyping([], en().formatToParts(123456), 1);
    const second = byTyping(first, en().formatToParts(1234567), 2);
    expect(second.filter((p) => p.role === "group").map((p) => p.key)).toEqual([
      "group@-6",
      "group@-3",
    ]);
  });

  it("gives every new digit a new key", () => {
    const first = byTyping([], en().formatToParts(0), 1);
    const second = byTyping(first, en().formatToParts(1), 2);
    expect(second[0].key).not.toBe(first[0].key);
  });
});

describe("byDiff", () => {
  it("keeps what two texts share", () => {
    const first = byDiff([], "Still not enough ETH", 1);
    const second = byDiff(first, "Not enough ETH", 2);
    const kept = second.filter((part) => first.some((p) => p.key === part.key));
    expect(kept.map((part) => part.char).join("")).toBe("ot enough ETH");
    expect(second[0].key).toBe("2:0");
  });

  it("splits by grapheme", () => {
    expect(byDiff([], "👍🏽!", 1).map((part) => part.char)).toEqual([
      "👍🏽",
      "!",
    ]);
  });
});

describe("lcs", () => {
  it("pairs a longest common subsequence", () => {
    expect(lcs([..."craft"], [..."creative"])).toEqual([
      [0, 0],
      [1, 1],
      [2, 3],
      [4, 4],
    ]);
  });
});
