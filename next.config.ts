import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
    resolveAlias: {
      tailwindcss: path.join(appRoot, "node_modules/tailwindcss"),
      "@tailwindcss/postcss": path.join(
        appRoot,
        "node_modules/@tailwindcss/postcss"
      ),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yfyxyzkopjwpkvamezdu.supabase.co',
      },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      source: '/e/:token*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=60, stale-while-revalidate=300',
        },
        { key: 'CDN-Cache-Control', value: 'public, max-age=60' },
        { key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=60' },
      ],
    },
    {
      source: '/favicon.ico',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
      ],
    },
  ],
};

export default nextConfig;
