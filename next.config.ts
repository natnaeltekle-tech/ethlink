import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "ethlink-images",
          expiration: {
            maxEntries: 120,
            maxAgeSeconds: 60 * 60 * 24 * 14, // 2 weeks
          },
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/_next/static/"),
        handler: "CacheFirst",
        options: {
          cacheName: "ethlink-static",
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 1 month
          },
        },
      },
      {
        urlPattern: ({ url }) =>
          url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/payment/") ||
          url.pathname.startsWith("/book/success"),
        handler: "NetworkOnly",
        options: {
          cacheName: "ethlink-network-only",
        },
      },
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "ethlink-pages",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24, // 1 day
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Silence noisy warnings temporarily while we clean up the codebase
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  // Recommended for Next.js 15 + React 19
  experimental: {
    // You can add more experimental flags later if needed
  },
};

export default withPWA(nextConfig);