import core from "@audio/core.json";
import crisp from "@audio/crisp.json";
import drums from "@audio/drums.json";
import mechanical from "@audio/mechanical.json";
import minimal from "@audio/minimal.json";
import organic from "@audio/organic.json";
import playful from "@audio/playful.json";
import retro from "@audio/retro.json";
import soft from "@audio/soft.json";
import synths from "@audio/synths.json";

export interface PatchJson {
  name: string;
  author: string;
  version: string;
  description: string;
  sounds: Record<string, unknown>;
}

export interface Patch {
  name: string;
  author: string;
  version: string;
  description: string;
  sounds: string[];
}

const PATCHES: PatchJson[] = [
  retro,
  mechanical,
  core,
  minimal,
  soft,
  crisp,
  organic,
  playful,
  drums,
  synths,
];

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const bySlug = new Map(PATCHES.map((json) => [slug(json.name), json]));

export const patches: Patch[] = Array.from(bySlug, ([name, json]) => ({
  name,
  author: json.author,
  version: json.version,
  description: json.description,
  sounds: Object.keys(json.sounds),
}));

export function getPatch(name: string): Patch | undefined {
  return patches.find((patch) => patch.name === name);
}

export function getPatchJson(name: string): PatchJson | undefined {
  return bySlug.get(name);
}
