
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

// Input schema for the prompt object (used by ai.definePrompt)
const PromptDataTypeSchema = z.object({
    pdfDataUri: z.string(),
    numQuestions: z.number(),
});

// Template for use with ai.definePrompt (handles {{media}} and {{{...}}} internally)
const QUIZ_GENERATION_PROMPT_TEMPLATE_FOR_DEFINE_PROMPT_HANDLEBARS = `You are an AI assistant specializing in creating educational quizzes from PDF documents.
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

Document Content:
{{media url=pdfDataUri}}
`;

// Template for direct ai.generate() calls (PDF passed as separate media part)
const QUIZ_GENERATION_PROMPT_TEXT_FOR_AI_GENERATE_FALLBACK = `You are an AI assistant specializing in creating educational quizzes from PDF documents.
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

// Base config (primarily for schema and reference, model specified per-use)
const QUIZ_GENERATION_PROMPT_CONFIG_BASE = {
  name: 'quizGenerationPrompt',
  input: { schema: PromptDataTypeSchema },
  output: { schema: QuizGenerationOutputSchema },
  // Model will be specified in definePrompt or generate calls
};

// Helper for simple string interpolation (used for ai.generate fallback text)
const handlebarsLikeInterpolate = (template: string, data: Record<string, any>): string => {
  return template.replace(/{{{?\s*(\w+)\s*}?}}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
  });
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
      modelName: 'googleai/gemini-2.0-flash', // Default Gemini model for user keys
    },
  ];

  for (const attempt of attempts) {
    if (attempt.apiKey && attempt.plugin) {
      console.log(`Attempting to use user-provided ${attempt.providerName} API key for quiz generation with model ${attempt.modelName}.`);
      try {
        const tempAi = baseGenkit({
          plugins: [attempt.plugin({ apiKey: attempt.apiKey })],
        });

        const tempPrompt = tempAi.definePrompt({
          name: `${QUIZ_GENERATION_PROMPT_CONFIG_BASE.name}_user${attempt.providerName}_${Date.now()}`,
          input: { schema: PromptDataTypeSchema }, // Full schema with pdfDataUri and numQuestions
          output: { schema: QuizGenerationOutputSchema },
          prompt: QUIZ_GENERATION_PROMPT_TEMPLATE_FOR_DEFINE_PROMPT_HANDLEBARS, // Use Handlebars template for Genkit to process
          config: {
            model: attempt.modelName, // Model specified here
          },
        });

        // Call tempPrompt with the full promptData object.
        // Genkit will use Handlebars to interpolate {{{numQuestions}}} and {{media url=pdfDataUri}}
        const { output } = await tempPrompt(promptData);
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
    const finalPromptTextForPlatform = handlebarsLikeInterpolate(
        QUIZ_GENERATION_PROMPT_TEXT_FOR_AI_GENERATE_FALLBACK,
        { numQuestions: promptData.numQuestions }
    );

    const generateResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash', // Explicitly specify model for direct call
      prompt: [
        { text: finalPromptTextForPlatform },
        { media: { url: promptData.pdfDataUri } }
      ],
      output: {
        format: 'json',
        schema: QuizGenerationOutputSchema,
      },
      config: {
        // safetySettings can be added here if needed
      }
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
