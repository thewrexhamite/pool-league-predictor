import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genkit requires server-side Node.js APIs
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', 'firebase-admin'],
};

export default nextConfig;
