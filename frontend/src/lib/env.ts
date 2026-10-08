/**
 * API base URLs.
 * - Browser code uses NEXT_PUBLIC_API_URL (http://localhost:8000/api/v1 in dev).
 * - Server Components prefer API_INTERNAL_URL (http://nginx/api/v1 inside Docker).
 */
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const env = {
  publicApiUrl: PUBLIC_API_URL.replace(/\/$/, ""),
  serverApiUrl: (process.env.API_INTERNAL_URL ?? PUBLIC_API_URL).replace(/\/$/, ""),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export const apiBaseUrl = () => (typeof window === "undefined" ? env.serverApiUrl : env.publicApiUrl);
