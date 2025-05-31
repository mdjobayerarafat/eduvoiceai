
"use client";

import { useState } from "react";
import { InterviewSetup } from "@/components/interviews/InterviewSetup";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getFirstInterviewQuestion } from "@/ai/flows/mock-interview-flow";
import type { InterviewConfigInput, FirstQuestionOutput } from "@/ai/flows/mock-interview-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InterviewStage = "setup" | "question_loading" | "interviewing" | "error";

export default function MockInterviewPage() {
  const [stage, setStage] = useState<InterviewStage>("setup");
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userAnswer, setUserAnswer] = useState<string>(""); // For future use
  const { toast } = useToast();

  const handleSetupComplete = async (data: InterviewConfigInput) => {
    setStage("question_loading");
    setError(null);
    try {
      const result: FirstQuestionOutput = await getFirstInterviewQuestion(data);
      setCurrentQuestion(result.firstQuestion);
      setStage("interviewing");
      toast({
        title: "Interview Started!",
        description: "The first question is ready.",
      });
    } catch (err) {
      console.error("Error getting first question:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to start interview: ${errorMessage}`);
      setStage("error");
      toast({
        title: "Error Starting Interview",
        description: "Could not fetch the first question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextQuestion = () => {
    // Placeholder for submitting answer and getting next question
    toast({
      title: "Next Question (Not Implemented)",
      description: "This functionality will be added soon.",
    });
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-semibold">Mock Interview</h1>
        <p className="text-muted-foreground mt-1">
          {stage === "setup" && "Practice your interviewing skills. Provide the job details and your resume to get started."}
          {stage === "question_loading" && "Getting the first question..."}
          {stage === "interviewing" && "Answer the question below."}
          {stage === "error" && "An error occurred."}
        </p>
      </div>
      <Separator />

      {error && stage === "error" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error} Please <Button variant="link" className="p-0 h-auto" onClick={() => { setStage("setup"); setError(null); }}>try setting up again</Button>.</AlertDescription>
        </Alert>
      )}

      {stage === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Interview Setup</CardTitle>
            <CardDescription>
              Fill in the details below to configure your mock interview session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterviewSetup 
              onSetupComplete={handleSetupComplete} 
              isProcessingSetup={stage === "question_loading"}
            />
          </CardContent>
        </Card>
      )}

      {stage === "question_loading" && (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Generating the first question...</p>
        </div>
      )}

      {stage === "interviewing" && currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl">Interviewer Asks:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg whitespace-pre-wrap">{currentQuestion}</p>
            <Textarea 
              placeholder="Type your answer here..." 
              rows={8} 
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="text-base"
            />
            <Button onClick={handleNextQuestion} className="w-full md:w-auto">
              Submit Answer & Get Next Question
            </Button>
             <p className="text-xs text-muted-foreground">Note: Getting the next question is not yet implemented.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
