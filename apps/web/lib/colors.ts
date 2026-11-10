import * as radix from "@radix-ui/colors";
import type { CSSProperties } from "react";

const SCALES = [
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
] as const;

type Steps = Record<string, string>;
const palette = radix as unknown as Record<string, Steps>;

function hash(input: string) {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** A Radix scale picked by name, as `--color-1..12` and `--color-a1..12`. */
export function colorScale(name: string): CSSProperties {
  const scale = SCALES[hash(name.trim().toLowerCase()) % SCALES.length];
  const light = palette[scale];
  const dark = palette[`${scale}Dark`];
  const lightA = palette[`${scale}A`];
  const darkA = palette[`${scale}DarkA`];
  const vars: Record<string, string> = {};
  for (let step = 1; step <= 12; step += 1) {
    vars[`--color-${step}`] =
      `light-dark(${light[`${scale}${step}`]}, ${dark[`${scale}${step}`]})`;
    vars[`--color-a${step}`] =
      `light-dark(${lightA[`${scale}A${step}`]}, ${darkA[`${scale}A${step}`]})`;
  }
  return vars as CSSProperties;
}
