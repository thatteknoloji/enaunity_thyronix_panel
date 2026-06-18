import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
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
