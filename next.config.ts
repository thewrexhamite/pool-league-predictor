import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genkit requires server-side Node.js APIs
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', 'firebase-admin'],

  // Allow OAuth provider profile images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.microsoft.com', // Microsoft
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net', // Facebook
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com', // Facebook
      },
    ],
  },
};

export default nextConfig;
