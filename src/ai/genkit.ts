
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import genkitNextPlugin from '@genkit-ai/next'; // Temporarily remove to troubleshoot

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}), // Explicitly pass API key
    // genkitNextPlugin() // Temporarily remove
  ],
  // Model should be specified per-prompt or per-generate call,
  model: 'googleai/gemini-2.0-flash',
  // but ensuring the plugin is configured with a key is vital.
});

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    'GEMINI_API_KEY is not set in the environment. Genkit Google AI plugin may not function correctly.'
  );
}
