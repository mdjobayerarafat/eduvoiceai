
"use client";

import { useState, useRef, useEffect } from "react";
import type { NextPage } from "next";
import { InterviewSetup } from "@/components/interviews/InterviewSetup";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getFirstInterviewQuestion } from "@/ai/flows/mock-interview-flow";
import type { InterviewConfigInput, FirstQuestionOutput } from "@/ai/flows/mock-interview-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Video, VideoOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InterviewStage = "setup" | "question_loading" | "interviewing" | "error";

const MockInterviewPage: NextPage = () => {
  const [stage, setStage] = useState<InterviewStage>("setup");
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userAnswer, setUserAnswer] = useState<string>(""); // For future use
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const manageCamera = async () => {
      if (stage === "interviewing") {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (err) {
            console.error('Error accessing camera:', err);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use this feature.',
            });
          }
        } else {
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: 'Your browser does not support camera access for this feature.',
          });
        }
      } else {
        // Stop camera if not in interviewing stage or component unmounts
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    };

    manageCamera();

    // Cleanup function to stop camera when component unmounts or stage changes from interviewing
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [stage, toast]);

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
          {stage === "interviewing" && "You're live! Answer the question below."}
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
             <CardTitle className="font-headline text-xl flex items-center">
              {hasCameraPermission ? <Video className="mr-2 text-green-500" /> : <VideoOff className="mr-2 text-red-500" />}
              Interviewer Asks:
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full aspect-video rounded-md bg-muted overflow-hidden border shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            </div>
            
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Camera Access Issue</AlertTitle>
                <AlertDescription>
                  Could not access your camera. Please ensure permissions are granted in your browser settings. The interview can continue with text.
                </AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === null && (
                 <Alert className="mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertTitle>Camera Status</AlertTitle>
                    <AlertDescription>
                        Attempting to access your camera...
                    </AlertDescription>
                 </Alert>
            )}


            <p className="text-lg whitespace-pre-wrap pt-4">{currentQuestion}</p>
            <Textarea 
              placeholder="Type your answer here..." 
              rows={6} 
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

export default MockInterviewPage;
