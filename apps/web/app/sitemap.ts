import type { MetadataRoute } from "next";
import { getPatchesAllTime } from "@/lib/db/patches";
import { source } from "@/lib/docs/source";
import { site } from "@/lib/kits";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docPages = source.getPages().map((page) => ({
    url: `${site.url}${page.url}`,
    changeFrequency: "weekly" as const,
  }));

  let patchPages: MetadataRoute.Sitemap = [];
  try {
    const patches = await getPatchesAllTime();
    patchPages = patches.map((patch) => ({
      url: `${site.url}/audio/library/${patch.name}`,
      lastModified: patch.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
    }));
  } catch {
    // Patch entries need the database; skip them when it isn't reachable.
  }

  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...docPages,
    {
      url: `${site.url}/audio/library`,
      changeFrequency: "daily",
    },
    ...patchPages,
  ];
}
