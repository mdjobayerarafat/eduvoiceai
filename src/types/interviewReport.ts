
import type { Models } from 'appwrite';

export interface InterviewExchangeForReport {
  question: string;
  answer: string;
}

export interface InterviewReport extends Models.Document {
  userId: string;
  jobDescription: string;
  resumeDataUri: string; // Storing the data URI directly for now
  overallScore: number;
  overallSummary: string;
  detailedFeedback: string; // JSON string of FinalInterviewFeedbackOutput['detailedFeedback']
  rawInterviewHistory?: string; // JSON string of InterviewExchangeForReport[]
  closingRemark?: string;
  // $createdAt and $updatedAt are provided by Appwrite by default
}

