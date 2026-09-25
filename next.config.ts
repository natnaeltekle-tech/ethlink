/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  // Pre-existing lint warnings across the repo must not block production deploys.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      // Supabase storage (service images, galleries, avatars)
      { protocol: 'https', hostname: '*.supabase.co' },
      // Default/placeholder imagery (see lib/constants.ts and category carousel)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      // Google-hosted avatars (Google sign-in profile photos)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  poweredByHeader: false,
};

export default nextConfig;
