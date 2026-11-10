import audio from "@web-kits/audio/package.json";
import blur from "@web-kits/blur/package.json";
import motionBlur from "@web-kits/motion-blur/package.json";
import react from "@web-kits/react/package.json";
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
  package: string;
  version: string;
  description: string;
  href: string;
};

export const kits: Kit[] = [
  {
    slug: "audio",
    name: "Audio",
    package: audio.name,
    version: audio.version,
    description: "Sounds described as plain objects, played with one call.",
    href: "/audio",
  },
  {
    slug: "springboard",
    name: "Springboard",
    package: springboard.name,
    version: springboard.version,
    description: "Apple's springs, app launch and genie for any element.",
    href: "/springboard",
  },
  {
    slug: "blur",
    name: "Blur",
    package: blur.name,
    version: blur.version,
    description: "The progressive blur from the iOS scroll edge.",
    href: "/blur",
  },
  {
    slug: "motion-blur",
    name: "Motion Blur",
    package: motionBlur.name,
    version: motionBlur.version,
    description: "Motion blur sized from speed, frame time and shutter.",
    href: "/motion-blur",
  },
  {
    slug: "react",
    name: "React",
    package: react.name,
    version: react.version,
    description: "SwiftUI's and Family's text and number transitions.",
    href: "/react",
  },
  {
    slug: "calligraph",
    name: "Calligraph",
    package: calligraph.name,
    version: calligraph.version,
    description: "Text that flows from one word to the next.",
    href: "/calligraph",
  },
];

export function getKit(slug: string): Kit | undefined {
  return kits.find((kit) => kit.slug === slug);
}
