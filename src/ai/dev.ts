
import { config } from 'dotenv';
config();

// Ensure all flow files are imported here so Genkit can discover them.
import '@/ai/flows/mock-interview-flow.ts'; 
import '@/ai/flows/topic-lecture-flow.ts';
import '@/ai/flows/interview-progression-flow.ts';
import '@/ai/flows/final-interview-feedback-flow.ts';
import '@/ai/flows/quiz-generation-flow.ts'; // Added new flow
    

    