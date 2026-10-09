import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Origin that serves Laravel media (avatars, covers) — derived from the public API URL. */
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1");

const nextConfig: NextConfig = {
  // Self-contained server for the production Docker image (frontend/Dockerfile)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Docker Desktop bind mounts (Windows/macOS) drop file events. The compose service opts into
  // polling; on the host (recommended for dev) native watching is used.
  ...(process.env.NEXT_WATCH_POLL_MS ? { watchOptions: { pollIntervalMs: Number(process.env.NEXT_WATCH_POLL_MS) } } : {}),
  images: {
    remotePatterns: [
      {
        protocol: apiOrigin.protocol.replace(":", "") as "http" | "https",
        hostname: apiOrigin.hostname,
        port: apiOrigin.port,
        pathname: "/storage/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
