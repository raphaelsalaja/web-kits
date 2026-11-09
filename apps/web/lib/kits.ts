import audio from "@web-kits/audio/package.json";
import blur from "@web-kits/blur/package.json";
import motionBlur from "@web-kits/motion-blur/package.json";
import springboard from "@web-kits/springboard/package.json";
import calligraph from "calligraph/package.json";

export const site = {
  name: "Web Kits",
  description: "Interface kits for the web.",
  url: "https://web-kits.dev",
  source: "https://github.com/raphaelsalaja/web-kits",
};

export type Kit = {
  slug: "audio" | "springboard" | "blur" | "motion-blur" | "calligraph";
  name: string;
  package: string;
  version: string;
  description: string;
  guide: { label: "Docs" | "Write-Up"; href: string };
  source: string;
};

const repo = (path: string) => `${site.source}/tree/main/${path}`;

export const kits: Kit[] = [
  {
    slug: "audio",
    name: "Audio",
    package: audio.name,
    version: audio.version,
    description: "Sounds described as plain objects, played with one call.",
    guide: { label: "Docs", href: audio.homepage },
    source: repo("packages/audio"),
  },
  {
    slug: "springboard",
    name: "Springboard",
    package: springboard.name,
    version: springboard.version,
    description: "Apple's springs, app launch and genie for any element.",
    guide: { label: "Write-Up", href: springboard.homepage },
    source: repo("packages/springboard"),
  },
  {
    slug: "blur",
    name: "Blur",
    package: blur.name,
    version: blur.version,
    description: "The progressive blur from the iOS scroll edge.",
    guide: { label: "Write-Up", href: blur.homepage },
    source: repo("packages/blur"),
  },
  {
    slug: "motion-blur",
    name: "Motion Blur",
    package: motionBlur.name,
    version: motionBlur.version,
    description: "Motion blur sized from speed, frame time and shutter.",
    guide: { label: "Write-Up", href: motionBlur.homepage },
    source: repo("packages/motion-blur"),
  },
  {
    slug: "calligraph",
    name: "Calligraph",
    package: calligraph.name,
    version: calligraph.version,
    description: "Text that flows from one word to the next.",
    guide: { label: "Docs", href: calligraph.homepage },
    source: "https://github.com/raphaelsalaja/calligraph",
  },
];

export const npm = (kit: Kit) => `https://www.npmjs.com/package/${kit.package}`;
