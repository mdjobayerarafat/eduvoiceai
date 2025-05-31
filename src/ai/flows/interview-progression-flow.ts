
'use server';
/**
 * @fileOverview Handles the progression of a mock interview, providing feedback on the user's last answer
 * and generating the next question.
 *
 * - getFeedbackAndNextQuestion - A function that processes the user's answer and generates feedback and the next question.
 * - InterviewProgressionInput - The input type for the getFeedbackAndNextQuestion function.
 * - InterviewProgressionOutput - The return type for the getFeedbackAndNextQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterviewExchangeSchema = z.object({
  question: z.string().describe("The question asked by the AI interviewer."),
  answer: z.string().describe("The user's answer to the question."),
});

const InterviewProgressionInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume of the candidate, as a data URI.'),
  jobDescription: z.string().describe('The job description for the role.'),
  interviewHistory: z.array(InterviewExchangeSchema).describe('A history of questions asked and answers given so far in the interview. The last item is the most recent exchange.'),
});
export type InterviewProgressionInput = z.infer<typeof InterviewProgressionInputSchema>;

const InterviewProgressionOutputSchema = z.object({
  feedbackOnLastAnswer: z.string().describe("Constructive feedback on the user's most recent answer."),
  nextQuestion: z.string().describe("The next interview question to ask the user."),
});
export type InterviewProgressionOutput = z.infer<typeof InterviewProgressionOutputSchema>;

export async function getFeedbackAndNextQuestion(input: InterviewProgressionInput): Promise<InterviewProgressionOutput> {
  return interviewProgressionFlow(input);
}

const interviewProgressionPrompt = ai.definePrompt({
  name: 'interviewProgressionPrompt',
  input: {schema: InterviewProgressionInputSchema},
  output: {schema: InterviewProgressionOutputSchema},
  prompt: `You are an AI Interviewer conducting a mock interview.
The candidate's resume and the job description are provided below.
You also have the history of questions you've asked and the candidate's answers.

Job Description:
{{{jobDescription}}}

Candidate's Resume:
{{media url=resume}}

Interview History (most recent exchange is last):
{{#each interviewHistory}}
Interviewer: {{{question}}}
Candidate: {{{answer}}}
---
{{/each}}

Your tasks are:
1. Provide concise, constructive feedback on the candidate's *last answer* in the interview history.
2. Generate the *next relevant interview question* to continue the interview. Ensure the question builds upon the interview so far or explores new relevant areas based on the resume and job description. Do not repeat questions.

Respond with only the feedback and the next question in the specified output format.
`,
});

const interviewProgressionFlow = ai.defineFlow(
  {
    name: 'interviewProgressionFlow',
    inputSchema: InterviewProgressionInputSchema,
    outputSchema: InterviewProgressionOutputSchema,
  },
  async (input) => {
    const {output} = await interviewProgressionPrompt(input);
    return output!;
  }
);
