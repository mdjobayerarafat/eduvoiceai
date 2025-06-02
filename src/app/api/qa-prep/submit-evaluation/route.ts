
import { NextResponse } from 'next/server';
import { 
    databases, 
    ID as AppwriteID, 
    Query, 
    AppwriteException,
    clientInitialized,
    initializationError,
    APPWRITE_DATABASE_ID, 
    USERS_COLLECTION_ID, // Not directly used here, but good practice if needed for user data
    QA_REPORTS_COLLECTION_ID,
    TRANSACTIONS_COLLECTION_ID // Not used here, but good practice if needed for token transactions
} from '@/lib/appwrite.node';
import type { QAReport, QAResultDetail } from '@/types/qaReport';
import type { QuizEvaluationOutput } from '@/ai/flows/quiz-evaluation-flow';

export async function POST(request: Request) {
  console.log("API /qa-prep/submit-evaluation: POST request received.");

  if (!clientInitialized) {
    console.error("API /qa-prep/submit-evaluation: Appwrite client not initialized.", initializationError);
    return NextResponse.json({ message: `Server configuration error: ${initializationError}`, errorType: "APPWRITE_INIT_ERROR" }, { status: 500 });
  }

  if (!APPWRITE_DATABASE_ID || !QA_REPORTS_COLLECTION_ID) {
    console.error("API /qa-prep/submit-evaluation: Appwrite Database or QA_REPORTS_COLLECTION_ID missing.");
    return NextResponse.json({ message: 'Server configuration error: Database or QA Reports Collection ID missing.', errorType: "APPWRITE_CONFIG_ERROR" }, { status: 500 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
    console.log("API /qa-prep/submit-evaluation: Parsed request body:", JSON.stringify(requestBody, null, 2));
  } catch (e: any) {
    console.error("API /qa-prep/submit-evaluation: Failed to parse request body as JSON:", e.message);
    return NextResponse.json({ message: 'Invalid request body: Must be JSON.', errorType: "INVALID_JSON_BODY" }, { status: 400 });
  }
  
  const { reportId, evaluationData, userAnswers: submittedUserAnswers } = requestBody as {
    reportId: string;
    evaluationData: QuizEvaluationOutput;
    userAnswers: string[];
  };

  if (!reportId) {
    console.warn("API /qa-prep/submit-evaluation: reportId missing from request body.");
    return NextResponse.json({ message: 'reportId is required.', errorType: "MISSING_REPORT_ID" }, { status: 400 });
  }
  if (!evaluationData) {
    console.warn("API /qa-prep/submit-evaluation: evaluationData missing from request body.");
    return NextResponse.json({ message: 'evaluationData is required.', errorType: "MISSING_EVALUATION_DATA" }, { status: 400 });
  }
   if (!Array.isArray(submittedUserAnswers)) {
    console.warn("API /qa-prep/submit-evaluation: userAnswers is missing or not an array.");
    return NextResponse.json({ message: 'userAnswers (array) is required.', errorType: "MISSING_USER_ANSWERS" }, { status: 400 });
  }
  if (typeof evaluationData.overallScore !== 'number' || typeof evaluationData.overallFeedback !== 'string' || !Array.isArray(evaluationData.detailedFeedback)) {
     console.warn("API /qa-prep/submit-evaluation: evaluationData has missing or invalid fields (overallScore, overallFeedback, or detailedFeedback). Received:", JSON.stringify(evaluationData, null, 2));
     return NextResponse.json({ message: 'evaluationData structure is invalid or missing key fields.', errorType: "INVALID_EVALUATION_DATA_STRUCTURE" }, { status: 400 });
  }


  try {
    console.log(`API /qa-prep/submit-evaluation: Fetching original report document with ID: ${reportId}`);
    const report = await databases.getDocument(APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, reportId) as QAReport;
    const originalQuestions: string[] = JSON.parse(report.generatedQuestions || "[]");
    console.log(`API /qa-prep/submit-evaluation: Fetched ${originalQuestions.length} original questions from DB.`);

    if (originalQuestions.length !== submittedUserAnswers.length) {
      console.warn(`API /qa-prep/submit-evaluation: Mismatch between number of original questions (${originalQuestions.length}) and submitted answers (${submittedUserAnswers.length}).`);
      // Continue processing but this might indicate an issue
    }

    const userAnswersAndFeedback: QAResultDetail[] = originalQuestions.map((qText, index) => {
      const aiDetail = evaluationData.detailedFeedback.find(d => d.questionText === qText);
      return {
        questionText: qText,
        userAnswer: submittedUserAnswers[index] !== undefined ? submittedUserAnswers[index] : "Not answered", // Ensure user answer is included
        aiFeedback: aiDetail?.aiFeedback || "No AI feedback provided for this question.",
        isCorrect: aiDetail?.isCorrect === undefined ? false : aiDetail.isCorrect, // Default to false if undefined
        score: aiDetail?.score === undefined ? 0 : aiDetail.score, // Default to 0 if undefined
      };
    });
    const userAnswersAndFeedbackJSON = JSON.stringify(userAnswersAndFeedback);
    console.log("API /qa-prep/submit-evaluation: Constructed userAnswersAndFeedbackJSON:", userAnswersAndFeedbackJSON.substring(0, 500) + (userAnswersAndFeedbackJSON.length > 500 ? "..." : ""));


    const updatePayload: Partial<QAReport> = {
      status: 'completed',
      overallScore: evaluationData.overallScore,
      maxScore: originalQuestions.length, // Max score is the number of questions
      overallFeedback: evaluationData.overallFeedback,
      userAnswersAndFeedback: userAnswersAndFeedbackJSON,
      completedAt: new Date().toISOString(),
    };
    console.log("API /qa-prep/submit-evaluation: Update payload for Appwrite:", JSON.stringify(updatePayload, null, 2));

    await databases.updateDocument(APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, reportId, updatePayload);
    console.log(`API /qa-prep/submit-evaluation: Report ${reportId} updated successfully in Appwrite.`);

    return NextResponse.json({ 
        message: 'Exam evaluation submitted and report updated successfully.',
        reportId: reportId,
        updatedStatus: 'completed'
    });

  } catch (error: any) {
    console.error(`API /qa-prep/submit-evaluation: Error processing submission for reportId ${reportId}:`, error);
    let errorMessage = 'An internal server error occurred during submission.';
    let errorType = "INTERNAL_SERVER_ERROR";
    let statusCode = 500;

    if (error instanceof AppwriteException) {
      errorMessage = `Appwrite Error (Code: ${error.code}, Type: ${error.type}): ${error.message}`;
      errorType = `APPWRITE_${error.type || error.code || 'GENERAL_ERROR'}`;
      statusCode = error.code === 404 ? 404 : 500; // If report not found, return 404
      if (error.code === 404) errorMessage = `Report with ID ${reportId} not found.`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Attempt to update the report status to 'error_evaluating' on the backend if a severe error occurs
    try {
        await databases.updateDocument(APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, reportId, {
            status: 'error_evaluating',
            overallFeedback: `Failed to process evaluation: ${errorMessage.substring(0, 200)}`,
        });
        console.log(`API /qa-prep/submit-evaluation: Marked report ${reportId} as 'error_evaluating' due to processing failure.`);
    } catch (statusUpdateError) {
        console.error(`API /qa-prep/submit-evaluation: CRITICAL - Failed to mark report ${reportId} as 'error_evaluating' after another error:`, statusUpdateError);
    }

    return NextResponse.json({ message: errorMessage, errorType, details: error.toString() }, { status: statusCode });
  }
}
