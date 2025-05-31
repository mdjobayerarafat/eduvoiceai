
'use server';
/**
 * @fileOverview Generates final feedback and a score for a completed mock interview.
 *
 * - getFinalInterviewFeedback - A function that processes the entire interview and generates overall feedback and score.
 * - FinalInterviewFeedbackInput - The input type for the getFinalInterviewFeedback function.
 * - FinalInterviewFeedbackOutput - The return type for the getFinalInterviewFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterviewExchangeSchema = z.object({
  question: z.string().describe("The question asked by the AI interviewer."),
  answer: z.string().describe("The user's answer to the question."),
});

const FinalInterviewFeedbackInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume of the candidate, as a data URI.'),
  jobDescription: z.string().describe('The job description for the role.'),
  fullInterviewHistory: z.array(InterviewExchangeSchema).describe('The complete history of questions asked and answers given during the interview.'),
});
export type FinalInterviewFeedbackInput = z.infer<typeof FinalInterviewFeedbackInputSchema>;

const QuestionSpecificFeedbackSchema = z.object({
  question: z.string().describe("The original interview question."),
  answer: z.string().describe("The candidate's answer to the question."),
  specificFeedback: z.string().describe("Constructive feedback specific to this question and answer."),
  questionScore: z.number().min(0).max(10).describe("A numerical score for the candidate's answer to this specific question, from 0 to 10 (0 being poor, 10 being excellent)."),
});

const FinalInterviewFeedbackOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("An overall score for the candidate's performance, out of 100."),
  overallSummary: z.string().describe("A concise overall summary of the candidate's performance, highlighting key strengths and areas for improvement."),
  detailedFeedback: z.array(QuestionSpecificFeedbackSchema).describe("An array of specific feedback for each question-answer pair from the interview, including a score for each answer."),
  closingRemark: z.string().describe("A brief, professional closing remark to end the interview session (e.g., 'Thank you for your time. This concludes our mock interview.')."),
});
export type FinalInterviewFeedbackOutput = z.infer<typeof FinalInterviewFeedbackOutputSchema>;

export async function getFinalInterviewFeedback(input: FinalInterviewFeedbackInput): Promise<FinalInterviewFeedbackOutput> {
  return finalInterviewFeedbackFlow(input);
}

const finalInterviewFeedbackPrompt = ai.definePrompt({
  name: 'finalInterviewFeedbackPrompt',
  input: {schema: FinalInterviewFeedbackInputSchema},
  output: {schema: FinalInterviewFeedbackOutputSchema},
  prompt: `You are an AI career coach. The candidate has just completed a mock interview.
The candidate's resume, the job description for the role they interviewed for, and the full transcript of the interview are provided below.

Job Description:
{{{jobDescription}}}

Candidate's Resume:
{{media url=resume}}

Full Interview Transcript:
{{#each fullInterviewHistory}}
Interviewer: {{{question}}}
Candidate: {{{answer}}}
---
{{/each}}

Your tasks are to:
1.  Provide an overall score for the candidate's performance in the interview, as a number out of 100.
2.  Write a concise overall summary of their performance. This summary should highlight key strengths and identify crucial areas for improvement based on the entire interview.
3.  For each question asked and the corresponding answer given by the candidate during the interview:
    a. Provide specific, constructive feedback.
    b. Assign a numerical score from 0 to 10 for the candidate's answer to that specific question (0=poor, 5=average, 10=excellent).
4.  Provide a brief, professional closing remark to conclude the interview session.

Respond strictly in the specified JSON output format. Ensure the 'overallScore' is a number between 0 and 100, and each 'questionScore' is a number between 0 and 10.
`,
});

const finalInterviewFeedbackFlow = ai.defineFlow(
  {
    name: 'finalInterviewFeedbackFlow',
    inputSchema: FinalInterviewFeedbackInputSchema,
    outputSchema: FinalInterviewFeedbackOutputSchema,
  },
  async (input) => {
    const {output} = await finalInterviewFeedbackPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return the expected output for final interview feedback.");
    }
    return output;
  }
);
