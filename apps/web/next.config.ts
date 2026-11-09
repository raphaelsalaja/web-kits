import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@web-kits/audio", "@web-kits/text"],
};

export default nextConfig;
