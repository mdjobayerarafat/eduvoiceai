
'use server';
/**
 * @fileOverview Handles the progression of a mock interview, providing feedback on the user's last answer
 * and generating the next question.
 * Implements a cascading API key fallback: User Gemini -> Platform Default.
 *
 * - getFeedbackAndNextQuestion - A function that processes the user's answer and generates feedback and the next question.
 * - InterviewProgressionInput - The input type for the getFeedbackAndNextQuestion function.
 * - InterviewProgressionOutput - The return type for the getFeedbackAndNextQuestion function.
 */

import { genkit as baseGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// import { openai } from '@genkit-ai/openai'; // @genkit-ai/openai not found, removing usage
import { ai } from '@/ai/genkit'; // Global AI instance
import { z } from 'genkit';

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
  geminiApiKey: z.string().optional().describe('Optional Google Gemini API key to use for this request.'),
  openaiApiKey: z.string().optional().describe('Optional OpenAI API key to use for this request (currently not supported by this flow).'),
  claudeApiKey: z.string().optional().describe('Optional Anthropic Claude API key to use for this request (currently not supported).'),
});
export type InterviewProgressionInput = z.infer<typeof InterviewProgressionInputSchema>;

const InterviewProgressionOutputSchema = z.object({
  feedbackOnLastAnswer: z.string().describe("Constructive feedback on the user's most recent answer."),
  nextQuestion: z.string().describe("The next interview question to ask the user. This can be an empty string if the AI determines there are no more relevant questions."),
});
export type InterviewProgressionOutput = z.infer<typeof InterviewProgressionOutputSchema>;

// Schema for the actual data passed to the prompt template
const PromptDataTypeSchema = z.object({
    resume: z.string(),
    jobDescription: z.string(),
    interviewHistory: z.array(InterviewExchangeSchema),
});

const INTERVIEW_PROGRESSION_PROMPT_CONFIG_BASE = {
  name: 'interviewProgressionPrompt',
  input: { schema: PromptDataTypeSchema }, 
  output: { schema: InterviewProgressionOutputSchema },
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
2. Generate the *next relevant interview question* to continue the interview.
   - Ensure the question builds upon the interview so far or explores new relevant areas based on the resume and job description. Do not repeat questions.
   - Aim to ask a diverse set of approximately 10 questions in total if the topic and context allow. If fewer than 8-10 questions have been asked and you can still formulate relevant questions, please provide one.
   - If you genuinely believe all relevant areas have been covered or the interview should conclude, you can return an empty string for the next question.

Respond with only the feedback and the next question in the specified output format.
`,
};

const interviewProgressionGlobalPlatformPrompt = ai.definePrompt(INTERVIEW_PROGRESSION_PROMPT_CONFIG_BASE);

async function generateFeedbackAndNextQuestionLogic(input: InterviewProgressionInput): Promise<InterviewProgressionOutput> {
  let llmResponse: InterviewProgressionOutput | undefined;
  const promptData: z.infer<typeof PromptDataTypeSchema> = {
    resume: input.resume,
    jobDescription: input.jobDescription,
    interviewHistory: input.interviewHistory,
  };

  const attempts = [
    {
      providerName: 'Gemini',
      apiKey: input.geminiApiKey,
      plugin: googleAI,
      modelName: 'googleai/gemini-2.0-flash',
    },
    // { // Removing OpenAI attempt as @genkit-ai/openai is not available
    //   providerName: 'OpenAI',
    //   apiKey: input.openaiApiKey,
    //   plugin: openai,
    //   modelName: 'openai/gpt-4o-mini',
    // },
  ];

  for (const attempt of attempts) {
    if (attempt.apiKey && attempt.plugin) {
      console.log(`Attempting to use user-provided ${attempt.providerName} API key for interview progression.`);
      try {
        const tempAi = baseGenkit({
          plugins: [attempt.plugin({ apiKey: attempt.apiKey })],
        });
        const tempPrompt = tempAi.definePrompt({
          ...INTERVIEW_PROGRESSION_PROMPT_CONFIG_BASE,
          name: `${INTERVIEW_PROGRESSION_PROMPT_CONFIG_BASE.name}_user${attempt.providerName}_${Date.now()}`,
          config: { model: attempt.modelName },
        });

        const { output } = await tempPrompt(promptData);
        llmResponse = output;
        if (!llmResponse) throw new Error(`Model (${attempt.providerName}) returned no output.`);
        
        console.log(`Successfully used user-provided ${attempt.providerName} API key for interview progression.`);
        return llmResponse;
      } catch (e: any) {
        console.warn(`Error using user-provided ${attempt.providerName} API key for interview progression:`, e.message);
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

        if (!isKeyError) throw e;
        console.log(`User's ${attempt.providerName} API key failed. Attempting next fallback.`);
      }
    }
  }

  console.log("Falling back to platform's default API key for interview progression.");
  const { output } = await interviewProgressionGlobalPlatformPrompt(promptData);
  llmResponse = output;

  if (!llmResponse) {
    throw new Error("AI model did not return the expected output for interview progression after all attempts.");
  }
  return llmResponse;
}

const interviewProgressionFlow = ai.defineFlow(
  {
    name: 'interviewProgressionFlow',
    inputSchema: InterviewProgressionInputSchema, 
    outputSchema: InterviewProgressionOutputSchema,
  },
  generateFeedbackAndNextQuestionLogic
);

export async function getFeedbackAndNextQuestion(input: InterviewProgressionInput): Promise<InterviewProgressionOutput> {
  return interviewProgressionFlow(input);
}
