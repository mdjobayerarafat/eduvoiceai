
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {genkitNext} from '@genkit-ai/next'; // Import the Next.js plugin

export const ai = genkit({
  plugins: [
    googleAI(),
    genkitNext() // Add the Next.js plugin
  ],
  // Remove model from global config, it's better to specify per-prompt or per-generate call
  // model: 'googleai/gemini-2.0-flash', 
});

