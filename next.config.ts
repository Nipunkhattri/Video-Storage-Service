import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move serverComponentsExternalPackages to root level as per Next.js 15.5.2
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/client-ses', '@aws-sdk/s3-request-presigner'],
  // Note: API route config is handled in individual route files
  // Timeout is configured per route using export const maxDuration
};

export default nextConfig;