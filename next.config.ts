import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genkit requires server-side Node.js APIs
  serverExternalPackages: ['genkit', '@genkit-ai/googleai'],
};

export default nextConfig;
