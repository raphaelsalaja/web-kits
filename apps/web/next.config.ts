import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@web-kits/audio",
    "@web-kits/blur",
    "@web-kits/motion-blur",
    "@web-kits/springboard",
  ],
};

export default nextConfig;
