import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase body size limit for file uploads
    serverComponentsExternalPackages: ['@aws-sdk/client-s3'],
  },
  // Note: API route config is handled in individual route files
  // Timeout is configured per route using export const maxDuration
};

export default nextConfig;