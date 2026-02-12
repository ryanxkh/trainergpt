import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (replaces PPR in Next.js 16)
  // Static shell renders at build time, dynamic data streams via Suspense
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
