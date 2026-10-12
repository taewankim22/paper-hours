import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // The scene owns imperative DOM/Three resources. Preserve the existing
  // single-mount lifecycle until those resources support Strict Mode replay.
  reactStrictMode: false,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
