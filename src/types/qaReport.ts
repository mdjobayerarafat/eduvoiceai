
import type { Models } from 'appwrite';

/**
 * Represents the structure of a document in the 'qa_reports' collection.
 */
export interface QAReport extends Models.Document {
  userId: string;
  pdfFileName?: string;
  pdfDataUri?: string; 
  quizTitle: string;
  numQuestionsSet: number;      
  numQuestionsGenerated: number;
  durationMinutes: number;      
  
  generatedQuestions: string;   // JSON string of string[] (question texts)
  generatedCorrectAnswers?: string; // JSON string of string[] (correct answers for generated questions)
  status: "generated" | "in_progress" | "completed" | "error_generating" | "error_evaluating" | "aborted";

  overallScore?: number | null;
  maxScore?: number | null;
  overallFeedback?: string | null;
  userAnswersAndFeedback?: string | null; // JSON string of QAResultDetail[]
  
  startedAt?: string | null;     
  completedAt?: string | null;   
}

/**
 * Represents the detailed result for a single question within a QAReport.
 * This structure would be part of the 'userAnswersAndFeedback' JSON string.
 */
export interface QAResultDetail {
  questionText: string;
  userAnswer?: string;
  correctAnswer?: string; 
  aiFeedback?: string;    
  isCorrect?: boolean;    
  score?: number;         
}
