
import { config } from 'dotenv';
config();

// Ensure all flow files are imported here so Genkit can discover them.
import '@/ai/flows/mock-interview-flow.ts'; // Renamed, but path might be the same if file wasn't renamed, or if it's a general interview flow now
import '@/ai/flows/topic-lecture-flow.ts';
// If you created a new file like 'generate-first-question-flow.ts', import it:
// import '@/ai/flows/generate-first-question-flow.ts';
