
// topic-lecture-flow.ts
'use server';

/**
 * @fileOverview Generates a lecture on a given topic, including summaries,
 * explanations, and relevant YouTube videos. Can use user-provided Gemini API key.
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
  name: 'topicLecturePrompt', // Name will be suffixed if temporary
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

// Global prompt instance using the global 'ai' object
const topicLectureGlobalPrompt = ai.definePrompt(LECTURE_PROMPT_CONFIG_BASE);

async function generateLectureLogic(input: TopicLectureInput): Promise<TopicLectureOutput> {
  let llmResponse;
  if (input.geminiApiKey) {
    console.log("Using user-provided Gemini API key for lecture generation.");
    const tempAi = baseGenkit({
      plugins: [googleAI({ apiKey: input.geminiApiKey })],
      model: ai.getModel(), // Use the same model name as global config or a default like 'googleai/gemini-2.0-flash'
    });
    const tempPrompt = tempAi.definePrompt({
      ...LECTURE_PROMPT_CONFIG_BASE,
      name: `${LECTURE_PROMPT_CONFIG_BASE.name}_userKeyed`, // Ensure unique name for temp prompt
    });
    const { output } = await tempPrompt(input);
    llmResponse = output;
  } else {
    console.log("Using platform's default API key for lecture generation.");
    const { output } = await topicLectureGlobalPrompt(input);
    llmResponse = output;
  }

  if (!llmResponse) {
    throw new Error("AI model did not return the expected output for the lecture.");
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
