import type { MetadataRoute } from "next";
import { source } from "@/lib/docs/source";
import { site } from "@/lib/kits";
import { patches } from "@/lib/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const docPages = source.getPages().map((page) => ({
    url: `${site.url}${page.url}`,
    changeFrequency: "weekly" as const,
  }));

  const patchPages = patches.map((patch) => ({
    url: `${site.url}/audio/library/${patch.name}`,
    changeFrequency: "weekly" as const,
  }));

  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...docPages,
    {
      url: `${site.url}/audio/library`,
      changeFrequency: "weekly",
    },
    ...patchPages,
  ];
}
