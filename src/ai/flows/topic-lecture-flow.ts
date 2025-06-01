
// topic-lecture-flow.ts
'use server';

/**
 * @fileOverview Generates a lecture on a given topic, including summaries,
 * explanations, and relevant YouTube videos.
 * Implements a cascading API key fallback: User Gemini -> User OpenAI -> User Claude -> Platform Default.
 *
 * - generateTopicLecture - A function that generates a lecture on a given topic.
 * - TopicLectureInput - The input type for the generateTopicLecture function.
 * - TopicLectureOutput - The return type for the generateTopicLecture function.
 */

import { genkit as baseGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { openai } from '@genkit-ai/openai'; // Ensure @genkit-ai/openai is installed if used
import { anthropic } from '@genkit-ai/anthropic'; // Ensure @genkit-ai/anthropic is installed if used
import { ai } from '@/ai/genkit'; // Global AI instance
import { z } from 'genkit';

const TopicLectureInputSchema = z.object({
  topic: z.string().describe('The topic for the lecture.'),
  geminiApiKey: z.string().optional().describe('Optional Google Gemini API key to use for this request.'),
  openaiApiKey: z.string().optional().describe('Optional OpenAI API key to use for this request.'),
  claudeApiKey: z.string().optional().describe('Optional Anthropic Claude API key to use for this request.'),
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
  input: { schema: TopicLectureInputSchema }, // Input schema used for type checking, actual input to prompt may vary based on provider
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
  // config: {
  //   // safetySettings can be defined here if needed universally, or per-provider
  // }
};

const topicLectureGlobalPlatformPrompt = ai.definePrompt(LECTURE_PROMPT_CONFIG_BASE);

async function generateLectureLogic(input: TopicLectureInput): Promise<TopicLectureOutput> {
  let llmResponse: TopicLectureOutput | undefined;

  const attempts = [
    {
      providerName: 'Gemini',
      apiKey: input.geminiApiKey,
      plugin: googleAI,
      modelName: 'googleai/gemini-2.0-flash', // Default model for this provider
    },
    {
      providerName: 'OpenAI',
      apiKey: input.openaiApiKey,
      plugin: openai, // Make sure @genkit-ai/openai is installed
      modelName: 'openai/gpt-4o-mini', // Example, ensure this model is available and suitable
    },
    {
      providerName: 'Claude',
      apiKey: input.claudeApiKey,
      plugin: anthropic, // Make sure @genkit-ai/anthropic is installed
      modelName: 'anthropic/claude-3-haiku-20240307', // Example, ensure this model is available
    },
  ];

  for (const attempt of attempts) {
    if (attempt.apiKey && attempt.plugin) {
      console.log(`Attempting to use user-provided ${attempt.providerName} API key for lecture generation.`);
      try {
        const tempAi = baseGenkit({
          plugins: [attempt.plugin({ apiKey: attempt.apiKey })],
        });
        const tempPrompt = tempAi.definePrompt({
          ...LECTURE_PROMPT_CONFIG_BASE,
          name: `${LECTURE_PROMPT_CONFIG_BASE.name}_user${attempt.providerName}_${Date.now()}`,
          config: {
            model: attempt.modelName,
            // safetySettings specific to this provider could be added here
          },
        });

        const { output } = await tempPrompt({ topic: input.topic }); // Pass only relevant fields for the prompt
        llmResponse = output;
        if (!llmResponse) throw new Error(`Model (${attempt.providerName}) returned no output.`);
        
        console.log(`Successfully used user-provided ${attempt.providerName} API key for lecture generation.`);
        return llmResponse; // Success, return immediately
      } catch (e: any) {
        console.warn(`Error using user-provided ${attempt.providerName} API key for lecture:`, e.message);
        const errorMessage = (e.message || "").toLowerCase();
        const errorStatus = e.status || e.code;
        const errorType = (e.type || "").toLowerCase();
        const isKeyError =
          errorMessage.includes("api key") ||
          errorMessage.includes("permission denied") ||
          errorMessage.includes("quota exceeded") ||
          errorMessage.includes("authentication failed") ||
          errorMessage.includes("invalid_request") ||
          errorMessage.includes("billing") ||
          errorMessage.includes("insufficient_quota") ||
          errorType.includes("api_key") ||
          errorStatus === 401 || errorStatus === 403 || errorStatus === 429 ||
          (e.cause && typeof e.cause === 'object' && 'code' in e.cause && e.cause.code === 7) ||
          (e.response && e.response.data && e.response.data.error && /api key/i.test(e.response.data.error.message));

        if (!isKeyError) {
          throw e; // Non-key related error, re-throw
        }
        console.log(`User's ${attempt.providerName} API key failed due to key-related issue. Attempting next fallback.`);
      }
    }
  }

  // Fallback to platform's default key
  console.log("Falling back to platform's default API key for lecture generation.");
  const { output } = await topicLectureGlobalPlatformPrompt({ topic: input.topic });
  llmResponse = output;

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
