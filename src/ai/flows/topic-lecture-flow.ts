
// topic-lecture-flow.ts
'use server';

/**
 * @fileOverview Generates a lecture on a given topic, including summaries,
 * explanations, and relevant YouTube videos.
 *
 * - generateTopicLecture - A function that generates a lecture on a given topic.
 * - TopicLectureInput - The input type for the generateTopicLecture function.
 * - TopicLectureOutput - The return type for the generateTopicLecture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TopicLectureInputSchema = z.object({
  topic: z.string().describe('The topic for the lecture.'),
  userAPIKey: z.string().optional().describe('Optional API key for enhanced lecture generation.'),
});
export type TopicLectureInput = z.infer<typeof TopicLectureInputSchema>;

const TopicLectureOutputSchema = z.object({
  lectureContent: z.string().describe('The generated lecture content.'),
  summary: z.string().describe('A summary of the lecture.'),
  youtubeVideoLinks: z.array(z.string()).describe('Links to relevant YouTube videos.'),
});
export type TopicLectureOutput = z.infer<typeof TopicLectureOutputSchema>;

export async function generateTopicLecture(input: TopicLectureInput): Promise<TopicLectureOutput> {
  return topicLectureFlow(input);
}

const topicLecturePrompt = ai.definePrompt({
  name: 'topicLecturePrompt',
  input: {schema: TopicLectureInputSchema},
  output: {schema: TopicLectureOutputSchema},
  prompt: `You are an AI assistant designed to generate lectures on various topics.

  Generate a comprehensive lecture on the topic: {{{topic}}}.

  The lecture should include:
  - A detailed summary of the topic.
  - Clear and concise explanations of key concepts.
  - A list of relevant, publicly available YouTube video links. Please provide full standard YouTube video URLs (e.g., 'https://www.youtube.com/watch?v=VIDEO_ID' or 'https://youtu.be/VIDEO_ID'). Avoid links to private, unlisted, or region-restricted videos if possible.

  Please ensure the lecture is informative, engaging, and easy to understand.

  If the user provided an API key, use it to improve the quality of the generated content.

  Output the lecture content, summary, and YouTube video links in a structured format.
  `,
});

const topicLectureFlow = ai.defineFlow(
  {
    name: 'topicLectureFlow',
    inputSchema: TopicLectureInputSchema,
    outputSchema: TopicLectureOutputSchema,
  },
  async input => {
    const {output} = await topicLecturePrompt(input);
    return output!;
  }
);

