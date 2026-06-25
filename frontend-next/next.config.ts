import type { NextConfig } from "next";

const API_TARGET = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  // Proxy /api/* to the (unchanged) Express backend so the frontend can keep
  // making same-origin requests — mirrors the old Vite dev proxy. In production
  // the app runs behind the same reverse proxy, so /api resolves there too.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
