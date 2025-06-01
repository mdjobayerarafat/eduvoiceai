
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import genkitNextPlugin from '@genkit-ai/next'; // Try importing as default

export const ai = genkit({
  plugins: [
    googleAI(),
    genkitNextPlugin() // Call the imported plugin function
  ],
  // Remove model from global config, it's better to specify per-prompt or per-generate call
  // model: 'googleai/gemini-2.0-flash', 
});
