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
  x: "https://x.com/raphaelsalaja",
  linkedin: "https://www.linkedin.com/in/raphael-salaja/",
};

export type Kit = {
  slug: string;
  name: string;
  version: string;
  description: string;
  href: string;
};

export const kits: Kit[] = [
  {
    slug: "audio",
    name: "Audio",
    version: audio.version,
    description: "Sounds described as plain objects, played with one call.",
    href: audio.homepage,
  },
  {
    slug: "springboard",
    name: "Springboard",
    version: springboard.version,
    description: "Apple's springs, app launch and genie for any element.",
    href: springboard.homepage,
  },
  {
    slug: "blur",
    name: "Blur",
    version: blur.version,
    description: "The progressive blur from the iOS scroll edge.",
    href: blur.homepage,
  },
  {
    slug: "motion-blur",
    name: "Motion Blur",
    version: motionBlur.version,
    description: "Motion blur sized from speed, frame time and shutter.",
    href: motionBlur.homepage,
  },
  {
    slug: "calligraph",
    name: "Calligraph",
    version: calligraph.version,
    description: "Text that flows from one word to the next.",
    href: calligraph.homepage,
  },
];
