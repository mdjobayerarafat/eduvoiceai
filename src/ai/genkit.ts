
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { genkitNext } from '@genkit-ai/next/plugin'; // Corrected import from subpath

export const ai = genkit({
  plugins: [
    googleAI(),
    genkitNext() // Call the imported plugin function
  ],
  // Remove model from global config, it's better to specify per-prompt or per-generate call
  // model: 'googleai/gemini-2.0-flash', 
});
