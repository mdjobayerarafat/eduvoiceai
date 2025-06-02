
'use server';
/**
 * @fileOverview Generates quiz questions and their correct answers from a PDF document.
 * Implements a cascading API key fallback: User Gemini -> Platform Default.
 *
 * - generateQuizQuestions - A function that generates quiz questions and answers.
 * - QuizGenerationInput - The input type for the function.
 * - QuizGenerationOutput - The return type for the function.
 */

import { genkit as baseGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ai } from '@/ai/genkit'; // Global AI instance
import { z } from 'genkit';

const QuizGenerationInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The content of the PDF document, as a data URI that must include a MIME type (application/pdf) and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  numQuestions: z
    .number()
    .min(5)
    .max(50)
    .describe('The number of questions to generate for the quiz (e.g., 10, 20, 30, 40, 50).'),
  geminiApiKey: z.string().optional().describe('Optional Google Gemini API key to use for this request.'),
});
export type QuizGenerationInput = z.infer<typeof QuizGenerationInputSchema>;

const QuizGenerationOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of generated quiz questions based on the provided PDF content.'),
  correctAnswers: z.array(z.string()).describe('An array of correct answers corresponding to the generated questions, derived from the PDF content.'),
  extractedTopicGuess: z.string().optional().describe('A guess of the main topic extracted from the PDF by the AI.'),
});
export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;

const PromptDataTypeSchema = z.object({
    pdfDataUri: z.string(),
    numQuestions: z.number(),
});

const QUIZ_GENERATION_PROMPT_TEXT_TEMPLATE = `You are an AI assistant specializing in creating educational quizzes from PDF documents.
Analyze the provided PDF document thoroughly. Based on its content, your tasks are:
1.  Attempt to identify and state the main topic or subject of the document. This will be your 'extractedTopicGuess'.
2.  Generate a quiz with exactly {{{numQuestions}}} questions. For each question, you MUST also provide the correct answer based *solely* on the information present in the PDF document.

The questions should be:
- Clear and unambiguous.
- Directly relevant to the core concepts, facts, and information presented in the document.
- Varied in how they probe understanding (e.g., definitions, implications, comparisons, processes described in the text).

The answers should be:
- Concise and factual, directly extracted or inferred from the PDF.
- Corresponding to the question generated.

Respond strictly in the specified JSON output format. Ensure you provide arrays for 'questions' and 'correctAnswers', and that these arrays are of the same length ({{{numQuestions}}}).

PDF Content is provided as a separate media part. Do not look for it in this text.
`;

const QUIZ_GENERATION_PROMPT_CONFIG_BASE = {
  name: 'quizGenerationPrompt',
  input: { schema: PromptDataTypeSchema },
  output: { schema: QuizGenerationOutputSchema },
  config: { model: 'googleai/gemini-2.0-flash' },
  prompt: QUIZ_GENERATION_PROMPT_TEXT_TEMPLATE, // Using the template that expects media separately
};


async function generateQuizLogic(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  let llmResponse: QuizGenerationOutput | undefined;
  const promptData: z.infer<typeof PromptDataTypeSchema> = {
    pdfDataUri: input.pdfDataUri,
    numQuestions: input.numQuestions,
  };

  const attempts = [
    {
      providerName: 'Gemini',
      apiKey: input.geminiApiKey,
      plugin: googleAI,
      modelName: 'googleai/gemini-2.0-flash',
    },
  ];

  for (const attempt of attempts) {
    if (attempt.apiKey && attempt.plugin) {
      console.log(`Attempting to use user-provided ${attempt.providerName} API key for quiz generation with model ${attempt.modelName}.`);
      try {
        const tempAi = baseGenkit({
          plugins: [attempt.plugin({ apiKey: attempt.apiKey })],
        });
        
        // Construct the prompt text by interpolating numQuestions
        const handlebarsLikeInterpolate = (template: string, data: Record<string, any>): string => {
            return template.replace(/{{{?\s*(\w+)\s*}?}}/g, (match, key) => {
                return data[key] !== undefined ? String(data[key]) : match;
            });
        };
        const interpolatedPromptText = handlebarsLikeInterpolate(QUIZ_GENERATION_PROMPT_TEXT_TEMPLATE, { numQuestions: promptData.numQuestions });

        const tempPrompt = tempAi.definePrompt({
          name: `${QUIZ_GENERATION_PROMPT_CONFIG_BASE.name}_user${attempt.providerName}_${Date.now()}`,
          input: { schema: z.object({ pdfDataUri: z.string() }) }, // Input for the prompt is just the URI
          output: { schema: QuizGenerationOutputSchema },
          prompt: `${interpolatedPromptText}\n\n{{media url=pdfDataUri}}`, // The prompt text now uses the media helper
          config: {
            model: attempt.modelName,
          },
        });
        
        // Call tempPrompt with only the pdfDataUri, as numQuestions is already in the prompt text
        const { output } = await tempPrompt({ pdfDataUri: promptData.pdfDataUri });
        llmResponse = output;

        if (!llmResponse || !llmResponse.questions || !llmResponse.correctAnswers) {
            throw new Error(`Model (${attempt.providerName}) returned invalid output (missing questions or answers).`);
        }
        if (llmResponse.questions.length !== input.numQuestions || llmResponse.correctAnswers.length !== input.numQuestions) {
            console.warn(`Model (${attempt.providerName}) returned ${llmResponse.questions.length} questions and ${llmResponse.correctAnswers.length} answers, but ${input.numQuestions} were requested.`);
        }

        console.log(`Successfully used user-provided ${attempt.providerName} API key. Generated ${llmResponse.questions.length} questions.`);
        return llmResponse;
      } catch (e: any) {
        console.warn(`Error using user-provided ${attempt.providerName} API key for quiz generation:`, e.message);
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

  console.log("Falling back to platform's default API key for quiz generation using direct ai.generate().");
  try {
    // Interpolate numQuestions into the base prompt text
    const handlebarsLikeInterpolate = (template: string, data: Record<string, any>): string => {
        return template.replace(/{{{?\s*(\w+)\s*}?}}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : match;
        });
    };
    const finalPromptTextForPlatform = handlebarsLikeInterpolate(QUIZ_GENERATION_PROMPT_TEXT_TEMPLATE, { numQuestions: promptData.numQuestions });

    const generateResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash', // Explicitly specify model for direct call
      prompt: [
        { text: finalPromptTextForPlatform }, // Interpolated prompt text
        { media: { url: promptData.pdfDataUri } } // Pass PDF as media part
      ],
      output: { 
        format: 'json',
        schema: QuizGenerationOutputSchema,
      },
    });
    
    llmResponse = generateResponse.output;

    if (!llmResponse || !llmResponse.questions || !llmResponse.correctAnswers) {
      throw new Error("The AI model did not return the expected questions and answers after direct ai.generate() fallback.");
    }
    if (llmResponse.questions.length !== input.numQuestions || llmResponse.correctAnswers.length !== input.numQuestions) {
       console.warn(`Platform model returned ${llmResponse.questions.length} questions and ${llmResponse.correctAnswers.length} answers, but ${input.numQuestions} were requested.`);
    }
    console.log(`Generated ${llmResponse.questions.length} questions using platform key (direct ai.generate). Topic guess: ${llmResponse.extractedTopicGuess}`);
    return llmResponse;

  } catch (fallbackError: any) {
      console.error("Error during platform fallback using direct ai.generate():", fallbackError);
      // This will be caught by the flow and then by the page, showing the error toast
      throw new Error(`Platform fallback for quiz generation failed: ${fallbackError.message || 'Unknown error during fallback'}`);
  }
}

const quizGenerationFlow = ai.defineFlow(
  {
    name: 'quizGenerationFlow',
    inputSchema: QuizGenerationInputSchema,
    outputSchema: QuizGenerationOutputSchema,
  },
  generateQuizLogic
);

export async function generateQuizQuestions(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  return quizGenerationFlow(input);
}

    