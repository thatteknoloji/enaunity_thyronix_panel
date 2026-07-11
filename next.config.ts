import type { NextConfig } from "next";

const skipBuildTypecheck = process.env.NEXT_SKIP_TYPECHECK === "1";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  ...(skipBuildTypecheck
    ? {
        eslint: {
          ignoreDuringBuilds: true,
        },
        typescript: {
          ignoreBuildErrors: true,
        },
      }
    : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  async rewrites() {
    const hiveMode = process.env.HIVE_PROXY_MODE || "internal";
    const hiveUrl = process.env.HIVE_BASE_URL || "https://hive.thiqos.com";

    if (hiveMode === "external") {
      return [
        {
          source: "/hive/:path*",
          destination: `${hiveUrl}/:path*`,
        },
        {
          source: "/hive",
          destination: `${hiveUrl}/`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
