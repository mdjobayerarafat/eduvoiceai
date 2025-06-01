
"use client";
console.log("ExamPage file loaded: /qa-prep/exam/[reportId]/page.tsx"); // Debug log

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter }    from "next/navigation";
import Link from "next/link";
import { account, databases, APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { QAReport, QAResultDetail } from "@/types/qaReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, ArrowLeft, ArrowRight, Send, Timer, CheckCircle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { quizEvaluationFlow } from "@/ai/flows/quiz-evaluation-flow"; // Stubbed flow
import type { QuizEvaluationInput, QuizEvaluationOutput } from "@/ai/flows/quiz-evaluation-flow";


export default function ExamPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [report, setReport] = useState<QAReport | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examCompleted, setExamCompleted] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<QuizEvaluationOutput | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadExamData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!reportId) {
        throw new Error("Report ID is missing.");
      }
      await account.get(); // Check auth

      const fetchedReport = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        QA_REPORTS_COLLECTION_ID,
        reportId
      ) as QAReport;

      setReport(fetchedReport);

      if (fetchedReport.status === "completed" && fetchedReport.overallFeedback) {
        setExamCompleted(true);
        // If already completed, parse and set evaluation results directly
        const parsedDetailedFeedback = fetchedReport.userAnswersAndFeedback ? JSON.parse(fetchedReport.userAnswersAndFeedback) : [];
        setEvaluationResult({
            overallScore: fetchedReport.overallScore || 0,
            overallFeedback: fetchedReport.overallFeedback || "Feedback not available.",
            detailedFeedback: parsedDetailedFeedback,
        });
        setQuestions(JSON.parse(fetchedReport.generatedQuestions || "[]"));
         const answers: Record<number, string> = {};
        parsedDetailedFeedback.forEach((item: QAResultDetail, index: number) => {
            if (item.userAnswer) answers[index] = item.userAnswer;
        });
        setUserAnswers(answers);
        setIsLoading(false);
        return;
      }
      
      if (fetchedReport.status !== "generated" && fetchedReport.status !== "in_progress") {
        setError(`This exam cannot be taken. Status: ${fetchedReport.status}.`);
        setIsLoading(false);
        return;
      }


      const parsedQuestions = JSON.parse(fetchedReport.generatedQuestions || "[]") as string[];
      setQuestions(parsedQuestions);
      setRemainingTime(fetchedReport.durationMinutes * 60);

      if (!fetchedReport.startedAt && fetchedReport.status === "generated") {
        await databases.updateDocument(APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, reportId, {
          startedAt: new Date().toISOString(),
          status: "in_progress"
        });
        setReport(prev => prev ? {...prev, startedAt: new Date().toISOString(), status: "in_progress"} : null);
      }

    } catch (err: any) {
      console.error("Error fetching exam data:", err);
      let specificError = "Could not load the exam. Please try again.";
      if (err instanceof AppwriteException) {
        if (err.code === 401) {
            toast({ title: "Unauthorized", description: "Please log in.", variant: "destructive"});
            router.push('/login');
            return;
        } else if (err.code === 404) {
            specificError = "Exam not found. It might have been deleted or the link is incorrect.";
        } else {
            specificError = `Appwrite Error: ${err.message}`;
        }
      } else if (err.message) {
        specificError = err.message;
      }
      setError(specificError);
      toast({ title: "Error", description: specificError, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [reportId, router, toast]);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);


  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (remainingTime === null || remainingTime <= 0 || examCompleted) return;

    timerRef.current = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime === null) return null;
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          handleFinishExam("timer_expired");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [remainingTime, examCompleted]); // Removed handleFinishExam from dependencies

  useEffect(() => {
    if (remainingTime !== null && remainingTime > 0 && !isLoading && !examCompleted && report?.status === "in_progress") {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingTime, isLoading, examCompleted, report?.status, startTimer]);


  const handleAnswerChange = (index: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [index]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinishExam = useCallback(async (reason: "manual" | "timer_expired") => {
    if (isSubmitting || examCompleted || !report) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    toast({ title: "Submitting Exam...", description: "Please wait while we evaluate your answers." });

    const answersArray = questions.map((_, index) => userAnswers[index] || "");

    try {
      // 1. Update status to in_progress_evaluation (optional, could be done in API)
      await databases.updateDocument(APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, reportId, {
        status: "in_progress_evaluation"
      });

      // 2. Call Genkit flow for evaluation (currently stubbed)
      const evaluationInput: QuizEvaluationInput = {
        questions: questions,
        userAnswers: answersArray,
      };
      const evaluationData = await quizEvaluationFlow(evaluationInput);
      setEvaluationResult(evaluationData);

      // 3. Send results to backend to save in Appwrite
      const submissionResponse = await fetch('/api/qa-prep/submit-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: reportId,
          evaluationData: evaluationData,
          userAnswers: answersArray, // Send raw answers for storage if needed
        }),
      });

      const submissionResult = await submissionResponse.json();
      if (!submissionResponse.ok) {
        throw new Error(submissionResult.message || "Failed to save evaluation results.");
      }

      setExamCompleted(true);
      toast({
        title: "Exam Finished & Evaluated!",
        description: `Your score: ${evaluationData.overallScore}/${report.numQuestionsGenerated}. ${evaluationData.overallFeedback}`,
        className: "bg-green-100 border-green-300 text-green-800",
        duration: 8000,
      });

    } catch (err: any) {
      console.error("Error finishing exam:", err);
      setError(`Failed to submit or evaluate exam: ${err.message}`);
      toast({ title: "Submission Error", description: err.message, variant: "destructive" });
      // Optionally, revert status if submission fails critically
      await databases.updateDocument(APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, reportId, {
        status: "error_evaluating" 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, examCompleted, report, questions, userAnswers, reportId, toast]);


  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Exam...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Exam</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/qa-prep/history">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Quizzes
          </Link>
        </Button>
      </div>
    );
  }

  if (!report || questions.length === 0) {
    return (
      <div className="space-y-6 text-center">
        <p className="text-muted-foreground">Exam data could not be loaded or no questions found.</p>
        <Button variant="outline" asChild>
          <Link href="/qa-prep/history">
             <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Quizzes
          </Link>
        </Button>
      </div>
    );
  }

  const currentQuestionText = questions[currentQuestionIndex];

  // Render Exam Completed State / Report View
  if (examCompleted && evaluationResult) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-semibold">Exam Report: {report.quizTitle}</h1>
                    <p className="text-muted-foreground mt-1">
                        Completed: {report.completedAt ? formatTime(new Date(report.completedAt).getTime()/1000) : "N/A"} | 
                        Score: {evaluationResult.overallScore} / {report.numQuestionsGenerated}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/qa-prep/history">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Quizzes
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Overall Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg font-semibold text-primary">Your Score: {evaluationResult.overallScore} / {report.numQuestionsGenerated}</p>
                    <p className="mt-2 whitespace-pre-wrap">{evaluationResult.overallFeedback}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Detailed Question Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {evaluationResult.detailedFeedback.map((item, index) => (
                        <Card key={index} className="p-4">
                            <p className="font-semibold">Q{index + 1}: {item.questionText}</p>
                            <p className="text-sm mt-1">Your Answer: <span className="p-1 rounded bg-muted/50 whitespace-pre-wrap">{item.userAnswer || <i className="text-muted-foreground">No answer provided.</i>}</span></p>
                            <div className={`mt-2 p-2 rounded ${item.isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <p className="text-sm font-medium flex items-center">
                                    {item.isCorrect ? <CheckCircle className="mr-2 h-4 w-4 text-green-600"/> : <XCircle className="mr-2 h-4 w-4 text-red-600"/>}
                                    Feedback (Score: {item.score || 0}):
                                </p>
                                <p className="text-xs whitespace-pre-wrap">{item.aiFeedback}</p>
                            </div>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-150px)]"> {/* Adjust height as needed */}
      <Card className="flex-grow flex flex-col">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="font-headline text-2xl">{report.quizTitle}</CardTitle>
                <CardDescription>
                    Question {currentQuestionIndex + 1} of {questions.length} | Duration: {report.durationMinutes} min
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted text-lg font-semibold font-mono">
                <Timer className="h-5 w-5 text-primary"/> {formatTime(remainingTime)}
            </div>
          </div>
           <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mt-3 h-2" />
        </CardHeader>

        <CardContent className="flex-grow flex flex-col space-y-4 overflow-y-auto">
          <div className="p-4 border rounded-md bg-muted/50 min-h-[100px] flex items-center">
            <p className="text-lg font-medium whitespace-pre-wrap">{currentQuestionText}</p>
          </div>
          <Textarea
            placeholder="Type your answer here..."
            rows={8}
            value={userAnswers[currentQuestionIndex] || ""}
            onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
            className="text-base flex-grow"
            disabled={isSubmitting || examCompleted}
          />
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitting || examCompleted}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              variant="outline"
              onClick={handleNextQuestion}
              disabled={isSubmitting || examCompleted}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleFinishExam("manual")}
              disabled={isSubmitting || examCompleted}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Submitting..." : "Finish Exam & Get Feedback"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

