'use server';

/**
 * @fileOverview Simulates a mock interview with an AI interviewer and provides personalized feedback.
 *
 * - mockInterview - A function that initiates and manages the mock interview process.
 * - MockInterviewInput - The input type for the mockInterview function, including resume, job description, and user responses.
 * - MockInterviewOutput - The return type for the mockInterview function, providing feedback and areas for improvement.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MockInterviewInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume of the candidate, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'),
  jobDescription: z.string().describe('The job description for the role the candidate is interviewing for.'),
  userResponses: z.array(z.string()).describe('An array of the candidate\'s responses to interview questions.'),
});
export type MockInterviewInput = z.infer<typeof MockInterviewInputSchema>;

const MockInterviewOutputSchema = z.object({
  overallFeedback: z.string().describe('Overall feedback on the candidate\'s performance.'),
  strengths: z.array(z.string()).describe('Specific strengths demonstrated by the candidate.'),
  areasForImprovement: z.array(z.string()).describe('Specific areas where the candidate can improve.'),
});
export type MockInterviewOutput = z.infer<typeof MockInterviewOutputSchema>;

export async function mockInterview(input: MockInterviewInput): Promise<MockInterviewOutput> {
  return mockInterviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'mockInterviewPrompt',
  input: {schema: MockInterviewInputSchema},
  output: {schema: MockInterviewOutputSchema},
  prompt: `You are an AI interview coach. Analyze the candidate's resume and their responses to interview questions based on the provided job description.

Provide overall feedback, highlight the candidate's strengths, and suggest areas for improvement.

Job Description: {{{jobDescription}}}

Resume: {{media url=resume}}

Candidate Responses:
{{#each userResponses}}
- {{{this}}}
{{/each}}
`,
});

const mockInterviewFlow = ai.defineFlow(
  {
    name: 'mockInterviewFlow',
    inputSchema: MockInterviewInputSchema,
    outputSchema: MockInterviewOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
