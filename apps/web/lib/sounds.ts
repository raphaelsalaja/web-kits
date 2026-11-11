import type { SoundDefinition } from "@web-kits/react/sound";

/** A library set's sounds, by name. */
export async function loadSounds(
  name: string,
): Promise<Record<string, SoundDefinition>> {
  const response = await fetch(`/api/patch/${name}`);
  if (!response.ok) throw new Error(`No sounds for ${name}`);
  const json: { sounds: Record<string, SoundDefinition> } =
    await response.json();
  return json.sounds;
}
