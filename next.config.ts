import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase body size limit for file uploads
    serverComponentsExternalPackages: ['@aws-sdk/client-s3'],
  },
  // Configure API route timeouts and limits
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
    responseLimit: false,
    externalResolver: true,
  },
  // Increase timeout for serverless functions (if using Vercel)
  serverRuntimeConfig: {
    // Timeout in seconds (10 minutes)
    maxDuration: 600,
  },
};

export default nextConfig;
