
// topic-lecture-flow.ts
'use server';

/**
 * @fileOverview Generates a lecture on a given topic, including summaries,
 * explanations, and relevant YouTube videos. Can use user-provided Gemini API key,
 * with fallback to platform key if user's key fails.
 *
 * - generateTopicLecture - A function that generates a lecture on a given topic.
 * - TopicLectureInput - The input type for the generateTopicLecture function.
 * - TopicLectureOutput - The return type for the generateTopicLecture function.
 */

import { genkit as baseGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ai } from '@/ai/genkit'; // Global AI instance
import { z } from 'genkit';

const TopicLectureInputSchema = z.object({
  topic: z.string().describe('The topic for the lecture.'),
  geminiApiKey: z.string().optional().describe('Optional Google Gemini API key to use for this request.'),
});
export type TopicLectureInput = z.infer<typeof TopicLectureInputSchema>;

const TopicLectureOutputSchema = z.object({
  lectureContent: z.string().describe('The generated lecture content.'),
  summary: z.string().describe('A summary of the lecture.'),
  youtubeVideoLinks: z.array(z.string()).describe('Links to relevant YouTube videos.'),
});
export type TopicLectureOutput = z.infer<typeof TopicLectureOutputSchema>;

const LECTURE_PROMPT_CONFIG_BASE = {
  name: 'topicLecturePrompt',
  input: { schema: TopicLectureInputSchema },
  output: { schema: TopicLectureOutputSchema },
  prompt: `You are an AI assistant designed to generate lectures on various topics.

  Generate a comprehensive lecture on the topic: {{{topic}}}.

  The lecture should include:
  - A detailed summary of the topic.
  - Clear and concise explanations of key concepts.
  - A list of relevant, publicly available YouTube video links. Please provide full standard YouTube video URLs (e.g., 'https://www.youtube.com/watch?v=VIDEO_ID' or 'https://youtu.be/VIDEO_ID'). Avoid links to private, unlisted, or region-restricted videos if possible.

  Please ensure the lecture is informative, engaging, and easy to understand.
  Output the lecture content, summary, and YouTube video links in a structured format.
  `,
};

const topicLectureGlobalPrompt = ai.definePrompt(LECTURE_PROMPT_CONFIG_BASE);

async function generateLectureLogic(input: TopicLectureInput): Promise<TopicLectureOutput> {
  let llmResponse;
  let userKeyFailed = false;

  if (input.geminiApiKey) {
    console.log("Attempting to use user-provided Gemini API key for lecture generation.");
    const tempAi = baseGenkit({
      plugins: [googleAI({ apiKey: input.geminiApiKey })],
      model: ai.getModel(), // Or a default like 'googleai/gemini-2.0-flash'
    });
    const tempPrompt = tempAi.definePrompt({
      ...LECTURE_PROMPT_CONFIG_BASE,
      name: `${LECTURE_PROMPT_CONFIG_BASE.name}_userKeyed_${Date.now()}`,
    });

    try {
      const { output } = await tempPrompt(input);
      llmResponse = output;
      console.log("Successfully used user-provided Gemini API key for lecture generation.");
    } catch (e: any) {
      console.warn("Error using user-provided Gemini API key for lecture:", e.message);
      const errorMessage = (e.message || "").toLowerCase();
      const errorStatus = e.status || e.code;
      const errorType = (e.type || "").toLowerCase();

      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("permission denied") ||
        errorMessage.includes("quota exceeded") ||
        errorMessage.includes("authentication failed") ||
        errorMessage.includes("invalid_request") || // Often for bad keys
        errorType.includes("api_key") ||
        errorStatus === 401 || errorStatus === 403 || errorStatus === 429 ||
        (e.cause && typeof e.cause === 'object' && 'code' in e.cause && e.cause.code === 7) // Example: google-gax permission denied
      ) {
        userKeyFailed = true;
        console.log("User's API key failed for lecture generation. Attempting fallback to platform key.");
      } else {
        throw e; // Re-throw if not a key-specific error
      }
    }
  }

  if (!input.geminiApiKey || userKeyFailed) {
    if (userKeyFailed) {
      console.log("Falling back to platform's default API key for lecture generation.");
    } else {
      console.log("Using platform's default API key for lecture generation (no user key provided or user key succeeded).");
    }
    // This block executes if no user key was provided OR if the user key failed and we need to fallback.
    // If userKey was provided AND succeeded, llmResponse is already set, and this block is skipped.
    if (!llmResponse) { 
        const { output } = await topicLectureGlobalPrompt(input);
        llmResponse = output;
    }
  }

  if (!llmResponse) {
    throw new Error("AI model did not return the expected output for the lecture after all attempts.");
  }
  return llmResponse;
}

const topicLectureFlow = ai.defineFlow(
  {
    name: 'topicLectureFlow',
    inputSchema: TopicLectureInputSchema,
    outputSchema: TopicLectureOutputSchema,
  },
  generateLectureLogic
);

export async function generateTopicLecture(input: TopicLectureInput): Promise<TopicLectureOutput> {
  return topicLectureFlow(input);
}
