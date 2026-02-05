'use server';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Import the AI configuration to ensure Genkit initializes
// when running the Genkit development server.
import '@/ai/genkit';

// Import all flows so they are registered with Genkit
import '@/ai/flows/match-analysis';
import '@/ai/flows/natural-language';
import '@/ai/flows/player-insights';
