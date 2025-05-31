
"use client";

import { useState, useRef, useEffect } from "react";
import type { NextPage } from "next";
import { InterviewSetup } from "@/components/interviews/InterviewSetup";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFirstInterviewQuestion } from "@/ai/flows/mock-interview-flow";
import type { InterviewConfigInput, FirstQuestionOutput } from "@/ai/flows/mock-interview-flow";
import { getFeedbackAndNextQuestion } from "@/ai/flows/interview-progression-flow";
import type { InterviewProgressionInput, InterviewProgressionOutput } from "@/ai/flows/interview-progression-flow";

import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Video, VideoOff, MessageSquare, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InterviewStage = "setup" | "first_question_loading" | "interviewing" | "next_question_loading" | "error";

interface InterviewExchange {
  question: string;
  answer: string;
  feedback?: string;
}

const MockInterviewPage: NextPage = () => {
  const [stage, setStage] = useState<InterviewStage>("setup");
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfigInput | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<InterviewExchange[]>([]);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const manageCamera = async () => {
      if (stage === "interviewing" || stage === "next_question_loading") {
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
            // Don't toast here repeatedly, rely on UI indicator
          }
        } else {
          setHasCameraPermission(false);
        }
      } else {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    };

    manageCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [stage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interviewHistory, currentQuestion]);

  const handleSetupComplete = async (data: InterviewConfigInput) => {
    setStage("first_question_loading");
    setError(null);
    setInterviewConfig(data); 
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

  const handleNextQuestion = async () => {
    if (!userAnswer.trim() || !currentQuestion || !interviewConfig) {
      toast({
        title: "Please provide an answer.",
        variant: "destructive",
      });
      return;
    }

    setStage("next_question_loading");
    setError(null);

    const currentExchange: InterviewExchange = { question: currentQuestion, answer: userAnswer };
    const updatedHistory = [...interviewHistory, currentExchange];
    
    try {
      const input: InterviewProgressionInput = {
        resume: interviewConfig.resume,
        jobDescription: interviewConfig.jobDescription,
        interviewHistory: updatedHistory,
      };
      const result: InterviewProgressionOutput = await getFeedbackAndNextQuestion(input);
      
      setInterviewHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
              newHistory[newHistory.length -1].feedback = result.feedbackOnLastAnswer;
          }
          return newHistory;
      });

      setCurrentQuestion(result.nextQuestion);
      setUserAnswer("");
      setStage("interviewing");
      toast({
        title: "Next Question Ready",
        description: "Feedback on your previous answer is available.",
      });
    } catch (err) {
      console.error("Error getting next question/feedback:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to get next question: ${errorMessage}`);
      setStage("error"); // Or revert to 'interviewing' to allow retry? For now, error state.
      toast({
        title: "Error Processing Answer",
        description: "Could not get feedback or the next question. Please try again if the issue persists.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]"> {/* Adjust height based on header/paddings */}
      <div>
        <h1 className="font-headline text-3xl font-semibold">Mock Interview</h1>
        <p className="text-muted-foreground mt-1">
          {stage === "setup" && "Practice your interviewing skills. Provide the job details and your resume."}
          {(stage === "first_question_loading" || stage === "next_question_loading") && "Processing..."}
          {stage === "interviewing" && "You're live! Answer the question below."}
          {stage === "error" && "An error occurred."}
        </p>
      </div>
      <Separator />

      {error && stage === "error" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error} Please <Button variant="link" className="p-0 h-auto" onClick={() => { setStage("setup"); setError(null); setInterviewConfig(null); setInterviewHistory([]); setCurrentQuestion(null); setUserAnswer(""); }}>restart setup</Button>.</AlertDescription>
        </Alert>
      )}

      {stage === "setup" && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Interview Setup</CardTitle>
            <CardDescription>
              Fill in the details below to configure your mock interview session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterviewSetup 
              onSetupComplete={handleSetupComplete} 
              isProcessingSetup={stage === "first_question_loading"}
            />
          </CardContent>
        </Card>
      )}

      {(stage === "first_question_loading" || stage === "next_question_loading") && (
        <div className="text-center py-12 flex-grow flex flex-col items-center justify-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">
            {stage === "first_question_loading" ? "Generating the first question..." : "Getting feedback and next question..."}
          </p>
        </div>
      )}
      
      {(stage === "interviewing" || stage === "next_question_loading") && (currentQuestion || interviewHistory.length > 0) && (
        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* Video Feed Section */}
          <div className="w-full md:w-1/3 lg:w-1/4 space-y-2 flex flex-col">
             <CardTitle className="font-headline text-lg flex items-center px-1">
              {hasCameraPermission ? <Video className="mr-2 text-green-500" /> : <VideoOff className="mr-2 text-red-500" />}
              Your Camera
            </CardTitle>
            <div className="w-full aspect-[4/3] rounded-md bg-muted overflow-hidden border shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            </div>
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-2 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <AlertTitle className="text-sm">Camera Issue</AlertTitle>
                <AlertDescription className="text-xs">
                  Could not access camera. Grant permissions in browser settings.
                </AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === null && stage === "interviewing" && ( // Only show loading if actively interviewing and not yet determined
                 <Alert className="mt-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <AlertTitle className="text-sm">Camera</AlertTitle>
                    <AlertDescription className="text-xs">
                        Checking camera access...
                    </AlertDescription>
                 </Alert>
            )}
          </div>

          {/* Q&A Section */}
          <Card className="flex-grow flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-headline text-xl flex items-center">
                <MessageSquare className="mr-2 text-primary" /> AI Interviewer
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-4 overflow-y-auto p-4">
              <ScrollArea className="flex-grow pr-2">
                <div className="space-y-4">
                  {interviewHistory.map((exchange, index) => (
                    <div key={index} className="space-y-2">
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="font-semibold">Interviewer:</p>
                        <p className="text-sm whitespace-pre-wrap">{exchange.question}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 text-right ml-auto max-w-[80%]">
                        <p className="font-semibold text-left">You:</p>
                        <p className="text-sm whitespace-pre-wrap text-left">{exchange.answer}</p>
                      </div>
                      {exchange.feedback && (
                        <div className="p-3 rounded-lg bg-secondary border border-primary/50">
                           <p className="font-semibold flex items-center"><Sparkles className="mr-2 h-4 w-4 text-accent" />Feedback:</p>
                           <p className="text-sm whitespace-pre-wrap">{exchange.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {currentQuestion && stage === "interviewing" && (
                     <div className="p-3 rounded-lg bg-muted">
                        <p className="font-semibold">Interviewer:</p>
                        <p className="text-sm whitespace-pre-wrap">{currentQuestion}</p>
                      </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {stage === "interviewing" && currentQuestion && (
                <div className="mt-auto pt-4 border-t">
                  <Textarea 
                    placeholder="Type your answer here..." 
                    rows={4} 
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="text-base"
                    disabled={stage === "next_question_loading"}
                  />
                  <Button 
                    onClick={handleNextQuestion} 
                    className="w-full md:w-auto mt-2"
                    disabled={stage === "next_question_loading" || !userAnswer.trim()}
                  >
                    {stage === "next_question_loading" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Submit Answer & Get Next Question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MockInterviewPage;
