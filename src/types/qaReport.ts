
import type { Models } from 'appwrite';

/**
 * Represents the structure of a document in the 'qa_reports' collection.
 */
export interface QAReport extends Models.Document {
  userId: string;
  pdfFileName?: string;
  pdfDataUri?: string; // Added to store the PDF content for evaluation
  quizTitle: string;
  numQuestionsSet: number;      // Number of questions the user selected
  numQuestionsGenerated: number;// Actual number of questions the AI generated
  durationMinutes: number;      // Selected exam duration in minutes
  
  generatedQuestions: string;   // JSON string of string[] (question texts)
  status: "generated" | "in_progress" | "completed" | "error_generating" | "error_evaluating" | "aborted";

  // Fields to be populated after the exam is taken and evaluated
  overallScore?: number | null;
  maxScore?: number | null;
  overallFeedback?: string | null;
  userAnswersAndFeedback?: string | null; // JSON string of QAResultDetail[]
  
  startedAt?: string | null;     // ISO datetime string when the exam was started
  completedAt?: string | null;   // ISO datetime string when the exam was completed/submitted
}

/**
 * Represents the detailed result for a single question within a QAReport.
 * This structure would be part of the 'userAnswersAndFeedback' JSON string.
 */
export interface QAResultDetail {
  questionText: string;
  userAnswer?: string;
  correctAnswer?: string; // The AI-derived correct answer
  aiFeedback?: string;    // AI's feedback on the user's answer
  isCorrect?: boolean;    // Determined by AI or comparison (true if score is 1)
  score?: number;         // Score for this individual question (0 or 1)
}

