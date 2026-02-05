import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Conditionally initialize the googleAI plugin only if the API key is available.
// This prevents the Genkit server from crashing during development if the
// .env file is not configured.
const plugins = process.env.GEMINI_API_KEY ? [googleAI()] : [];

export const ai = genkit({
  plugins,
});
