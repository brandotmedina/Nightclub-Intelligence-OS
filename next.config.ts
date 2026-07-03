import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hbvqcygyufkjymdflgxo.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/events",
        destination: "/midnight-club/events",
        permanent: true,
      },
      {
        source: "/events/:id",
        destination: "/midnight-club/events/:id",
        permanent: true,
      },
      {
        source: "/events/:id/vip",
        destination: "/midnight-club/events/:id/vip",
        permanent: true,
      },
      {
        source: "/events/:id/success",
        destination: "/midnight-club/events/:id/success",
        permanent: true,
      },
      {
        source: "/events/:id/vip/confirmed",
        destination: "/midnight-club/events/:id/vip/confirmed",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
