
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { NextPage } from "next";
import Image from "next/image";
import { InterviewSetup } from "@/components/interviews/InterviewSetup";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { getFirstInterviewQuestion } from "@/ai/flows/mock-interview-flow";
import type { InterviewConfigInput, FirstQuestionOutput } from "@/ai/flows/mock-interview-flow";
import { getFeedbackAndNextQuestion } from "@/ai/flows/interview-progression-flow";
import type { InterviewProgressionInput, InterviewProgressionOutput } from "@/ai/flows/interview-progression-flow";
import { getFinalInterviewFeedback } from "@/ai/flows/final-interview-feedback-flow";
import type { FinalInterviewFeedbackInput, FinalInterviewFeedbackOutput } from "@/ai/flows/final-interview-feedback-flow";

import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Video, VideoOff, MessageSquare, Sparkles, Mic, MicOff, Volume2, VolumeX, TimerIcon, StopCircle, ThumbsUp, ThumbsDown, Award, Camera, CameraOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InterviewStage = "setup" | "first_question_loading" | "interviewing" | "next_question_loading" | "final_feedback_loading" | "final_feedback_display" | "error";

interface InterviewExchange {
  question: string;
  answer: string;
}

const SpeechRecognition = (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
const speechSynthesis = (typeof window !== 'undefined' && window.speechSynthesis) || null;

const INTERVIEW_DURATION_MINUTES = 10;

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
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isCameraBeingToggled, setIsCameraBeingToggled] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [remainingTime, setRemainingTime] = useState(INTERVIEW_DURATION_MINUTES * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [finalFeedback, setFinalFeedback] = useState<FinalInterviewFeedbackOutput | null>(null);

  const speakText = useCallback((text: string) => {
    if (!speechSynthesis || !isTTSEnabled || !text) return;
    try {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsAISpeaking(true);
      utterance.onend = () => setIsAISpeaking(false);
      utterance.onerror = (event) => {
        setIsAISpeaking(false);
        toast({ title: "Speech Error", description: "Could not play AI voice.", variant: "destructive"});
      };
      speechSynthesis.speak(utterance);
    } catch (e) {
      setIsAISpeaking(false);
      toast({ title: "Speech Error", description: "Could not play AI voice.", variant: "destructive"});
    }
  }, [isTTSEnabled, toast]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingTime(INTERVIEW_DURATION_MINUTES * 60);
    timerRef.current = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          handleEndInterview("timer");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
  },[]);


  useEffect(() => {
    return () => { 
      stopTimer();
      if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopCameraStream();
    };
  }, [stopTimer, stopCameraStream]);


  useEffect(() => {
    if (!SpeechRecognition) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support voice input. Please type your answers.",
        variant: "destructive",
        duration: 5000,
      });
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        let errorMsg = "Speech recognition error. Please try again.";
        if (event.error === 'no-speech') {
            errorMsg = "No speech was detected. Please ensure your microphone is working and try again.";
        } else if (event.error === 'audio-capture') {
            errorMsg = "Microphone error. Could not capture audio. Please check your microphone connection and permissions.";
        } else if (event.error === 'not-allowed') {
            errorMsg = "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (event.error === 'network') {
            errorMsg = "Network error. Speech recognition may require an internet connection.";
        }
        toast({ title: "Voice Input Error", description: errorMsg, variant: "destructive" });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript.trim()) {
             setUserAnswer(prev => prev + finalTranscript.trim() + " "); 
        }
      };
      recognitionRef.current = recognition;
    }
  }, [toast]);


  useEffect(() => {
    const manageCamera = async () => {
      if (!isVideoEnabled || isCameraBeingToggled) {
        stopCameraStream();
        setHasCameraPermission(null); // Reset permission status if video explicitly disabled
        return;
      }

      if (stage === "interviewing" || stage === "next_question_loading" || stage === "final_feedback_loading") {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (err) {
            setHasCameraPermission(false);
             toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use video.',
            });
          }
        } else {
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: 'Your browser does not support camera access.',
          });
        }
      } else if (stage !== "final_feedback_display") { 
        stopCameraStream();
      }
    };

    manageCamera();
  }, [stage, toast, isVideoEnabled, stopCameraStream, isCameraBeingToggled]);

  useEffect(() => {
    if (stage === "final_feedback_display" || stage === "error" || stage === "setup") {
        stopTimer();
        stopCameraStream();
    }
  }, [stage, stopTimer, stopCameraStream]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interviewHistory, currentQuestion, finalFeedback]);

  const handleSetupComplete = async (data: InterviewConfigInput) => {
    setStage("first_question_loading");
    setError(null);
    setInterviewConfig(data); 
    setInterviewHistory([]);
    setFinalFeedback(null);
    setCurrentQuestion(null);
    setUserAnswer("");
    setIsVideoEnabled(true); // Ensure video is attempted to be enabled on new interview start
    try {
      const result: FirstQuestionOutput = await getFirstInterviewQuestion(data);
      setCurrentQuestion(result.firstQuestion);
      setStage("interviewing");
      startTimer();
      speakText(result.firstQuestion); // AI's first question (includes greeting)
      toast({
        title: "Interview Started!",
        description: "The first question is ready. The timer has begun.",
      });
    } catch (err) {
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

  const handleToggleListen = () => {
    if (!SpeechRecognition || !recognitionRef.current) {
      toast({ title: "Voice Input Not Supported", description: "Your browser doesn't support speech recognition.", variant: "destructive" });
      return;
    }
    if (isAISpeaking) {
        toast({ title: "AI is speaking", description: "Please wait for the AI to finish speaking.", variant: "default" });
        return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
         setIsListening(false); 
         let errorMsg = "Could not start voice input. ";
         // @ts-ignore
         if (e && e.name) { 
            // @ts-ignore
            if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
                errorMsg += "Microphone access was denied. Please allow microphone access in your browser settings and refresh the page.";
            // @ts-ignore
            } else if (e.name === 'InvalidStateError') {
                errorMsg += "Speech recognition is already active or in an invalid state. Please try again.";
            } else {
                errorMsg += "Please check your microphone and browser settings.";
            }
         } else {
            errorMsg += "An unexpected error occurred. Please check your microphone.";
         }
         toast({ title: "Voice Input Error", description: errorMsg, variant: "destructive" });
      }
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
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
    }
    if (speechSynthesis?.speaking) {
        speechSynthesis.cancel();
        setIsAISpeaking(false);
    }

    setStage("next_question_loading");
    setError(null);

    const currentExchange: InterviewExchange = { question: currentQuestion, answer: userAnswer.trim() };
    
    try {
      const input: InterviewProgressionInput = {
        resume: interviewConfig.resume,
        jobDescription: interviewConfig.jobDescription,
        interviewHistory: [...interviewHistory, { question: currentQuestion, answer: userAnswer.trim() }],
      };
      const result: InterviewProgressionOutput = await getFeedbackAndNextQuestion(input);
      
      setInterviewHistory(prev => [...prev, currentExchange]);
      
      if (result.nextQuestion) {
        setCurrentQuestion(result.nextQuestion);
        if (isTTSEnabled) speakText(result.nextQuestion);
        setStage("interviewing");
         toast({ title: "Next Question Ready" });
      } else {
        setCurrentQuestion(null);
        toast({ title: "Interview Concluding", description: "The AI has no more questions."});
        handleEndInterview("no_more_questions");
      }
      setUserAnswer("");

    } catch (err) {
      setInterviewHistory(prev => [...prev, currentExchange]);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to get next question: ${errorMessage}`);
      setStage("error"); 
      toast({
        title: "Error Processing Answer",
        description: "Could not get the next question. Please try again if the issue persists.",
        variant: "destructive",
      });
      setIsAISpeaking(false);
    }
  };

  const handleEndInterview = async (reason: "timer" | "manual" | "no_more_questions") => {
    stopTimer();
    setStage("final_feedback_loading");
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
    if (speechSynthesis?.speaking) speechSynthesis.cancel();
    setIsAISpeaking(false);

    let endMessage = "Interview ended. ";
    if (reason === "timer") endMessage += "Time's up!";
    if (reason === "manual") endMessage += "You ended the interview.";
    if (reason === "no_more_questions") endMessage += "The AI has no more questions for you at this time.";

    toast({
        title: "Interview Over",
        description: `${endMessage} Generating final feedback...`,
    });

    if (!interviewConfig ) { 
        toast({ title: "Not Enough Data", description: "Interview setup not complete.", variant: "destructive" });
        setStage("setup"); 
        return;
    }
    
    let finalInterviewHistory = [...interviewHistory];
    if (currentQuestion && userAnswer.trim() && (reason === "timer" || reason === "manual")) {
        const lastAnswerNotYetInHistory = !finalInterviewHistory.some(ex => ex.question === currentQuestion && ex.answer === userAnswer.trim());
        if (lastAnswerNotYetInHistory) {
            finalInterviewHistory.push({ question: currentQuestion, answer: userAnswer.trim() });
        }
    }

    if (finalInterviewHistory.length === 0 && currentQuestion && userAnswer.trim()){
         finalInterviewHistory.push({ question: currentQuestion, answer: userAnswer.trim() });
    }

    try {
      const input: FinalInterviewFeedbackInput = {
        resume: interviewConfig.resume,
        jobDescription: interviewConfig.jobDescription,
        fullInterviewHistory: finalInterviewHistory.map(h => ({ question: h.question, answer: h.answer })),
      };
      const result = await getFinalInterviewFeedback(input);
      setFinalFeedback(result);
      setStage("final_feedback_display");
      let farewellMessage = `Your interview is complete. You scored ${result.overallScore} out of 100. ${result.overallSummary}.`;
      if (result.closingRemark) {
        farewellMessage = `${result.closingRemark} ${farewellMessage}`;
      }
      speakText(farewellMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to get final feedback: ${errorMessage}`);
      setStage("error");
      toast({
        title: "Error Getting Final Feedback",
        description: "Could not generate the final interview report.",
        variant: "destructive",
      });
    }
  };

  const toggleTTS = () => {
    setIsTTSEnabled(prev => {
      const newTTSEnabledState = !prev;
      if (!newTTSEnabledState && speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
        setIsAISpeaking(false);
      }
      toast({
        title: `AI Voice ${newTTSEnabledState ? "Enabled" : "Disabled"}`,
      });
      return newTTSEnabledState;
    });
  };

  const toggleCamera = async () => {
    setIsCameraBeingToggled(true);
    const newVideoEnabledState = !isVideoEnabled;
    setIsVideoEnabled(newVideoEnabledState);
    if (!newVideoEnabledState) {
        stopCameraStream();
        setHasCameraPermission(null); // User explicitly turned off camera
    }
    // The useEffect for manageCamera will handle re-requesting permission if turned back on
    toast({ title: `Camera ${newVideoEnabledState ? "Enabled" : "Disabled"}` });
    // Allow time for stream to stop/start before resetting toggle flag
    setTimeout(() => setIsCameraBeingToggled(false), 500); 
  };


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestart = () => {
    stopTimer();
    setStage("setup");
    setError(null);
    setInterviewConfig(null);
    setInterviewHistory([]);
    setCurrentQuestion(null);
    setUserAnswer("");
    setIsAISpeaking(false);
    setIsListening(false);
    setFinalFeedback(null);
    setRemainingTime(INTERVIEW_DURATION_MINUTES * 60);
    stopCameraStream();
    setHasCameraPermission(null); 
    setIsVideoEnabled(true); // Default to video enabled for new interview
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-headline text-3xl font-semibold">Mock Interview</h1>
            <p className="text-muted-foreground mt-1">
              {stage === "setup" && "Practice your interviewing skills. Provide the job details and your resume."}
              {(stage === "first_question_loading" || stage === "next_question_loading" || stage === "final_feedback_loading") && "Processing..."}
              {stage === "interviewing" && "You're live! Answer the question below."}
              {stage === "final_feedback_display" && "Interview Complete. Review your feedback."}
              {stage === "error" && "An error occurred."}
            </p>
          </div>
           {(stage === "interviewing" || stage === "next_question_loading" || stage === "final_feedback_loading" || stage === "final_feedback_display") && (
             <div className="flex items-center gap-2">
                <Button onClick={toggleTTS} variant="outline" size="icon" title={isTTSEnabled ? "Mute AI Voice" : "Unmute AI Voice"}>
                    {isTTSEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
                {(stage === "interviewing" || stage === "next_question_loading" || stage === "final_feedback_loading") && (
                    <Button onClick={toggleCamera} variant="outline" size="icon" title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"} disabled={isCameraBeingToggled}>
                        {isCameraBeingToggled ? <Loader2 className="h-5 w-5 animate-spin" /> : (isVideoEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />)}
                    </Button>
                )}
             </div>
          )}
        </div>
      </div>
      <Separator />

      {error && stage === "error" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error} Please <Button variant="link" className="p-0 h-auto" onClick={handleRestart}>restart setup</Button>.</AlertDescription>
        </Alert>
      )}

      {stage === "setup" && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Interview Setup</CardTitle>
            <CardDescription>
              Fill in the details below to configure your mock interview session ({INTERVIEW_DURATION_MINUTES} minutes).
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

      {(stage === "first_question_loading" || stage === "next_question_loading" || stage === "final_feedback_loading") && (
        <div className="text-center py-12 flex-grow flex flex-col items-center justify-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">
            {stage === "first_question_loading" && "Generating the first question..."}
            {stage === "next_question_loading" && "Getting next question..."}
            {stage === "final_feedback_loading" && "Generating your final interview report..."}
          </p>
        </div>
      )}
      
      {(stage === "interviewing" || stage === "next_question_loading") && (currentQuestion || interviewHistory.length > 0) && (
        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
          <div className="w-full md:w-1/3 lg:w-1/4 space-y-2 flex flex-col">
            <Card>
              <CardHeader className="pb-2">
                 <CardTitle className="font-headline text-lg flex items-center">
                  <TimerIcon className="mr-2 text-primary" /> Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-mono font-semibold text-center">{formatTime(remainingTime)}</p>
                <Progress value={(remainingTime / (INTERVIEW_DURATION_MINUTES * 60)) * 100} className="mt-2 h-2" />
              </CardContent>
            </Card>
            
             <CardTitle className="font-headline text-lg flex items-center px-1 pt-2">
              {isVideoEnabled && hasCameraPermission ? <Video className="mr-2 text-green-500" /> : <VideoOff className="mr-2 text-red-500" />}
              Your Camera
            </CardTitle>
            <div className="w-full aspect-[4/3] rounded-md bg-muted overflow-hidden border shadow-inner flex items-center justify-center">
              {isVideoEnabled ? (
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              ) : (
                <Image src="https://placehold.co/600x400.png" alt="Camera off" width={600} height={400} className="w-full h-full object-cover opacity-50" data-ai-hint="video off user avatar" />
              )}
            </div>
            {isVideoEnabled && hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-2 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <AlertTitle className="text-sm">Camera Issue</AlertTitle>
                <AlertDescription className="text-xs">
                  Could not access camera. Please grant permissions.
                </AlertDescription>
              </Alert>
            )}
            {isVideoEnabled && hasCameraPermission === null && (stage === "interviewing" || stage === "next_question_loading") && !isCameraBeingToggled && ( 
                 <Alert className="mt-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <AlertTitle className="text-sm">Camera</AlertTitle>
                    <AlertDescription className="text-xs">
                        Checking camera access...
                    </AlertDescription>
                 </Alert>
            )}
             <Button onClick={() => handleEndInterview("manual")} variant="outline" className="w-full mt-auto" disabled={stage === "next_question_loading" || stage === "final_feedback_loading"}>
                <StopCircle className="mr-2 h-4 w-4" /> End Interview Early
            </Button>
          </div>

          <Card className="flex-grow flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                 <Image 
                    src="https://placehold.co/80x80.png" 
                    alt="AI Interviewer Profile" 
                    width={40} 
                    height={40} 
                    className="rounded-full mr-3"
                    data-ai-hint="robot avatar" 
                  />
                <CardTitle className="font-headline text-xl flex items-center">
                  <MessageSquare className="mr-2 text-primary" /> AI Interviewer
                  {isAISpeaking && <Volume2 className="ml-2 h-5 w-5 text-accent animate-pulse" />}
                </CardTitle>
              </div>
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
                      <div className="p-3 rounded-lg bg-primary/10 text-right ml-auto max-w-[80%] self-end">
                        <p className="font-semibold text-left">You:</p>
                        <p className="text-sm whitespace-pre-wrap text-left">{exchange.answer}</p>
                      </div>
                    </div>
                  ))}
                  {currentQuestion && (stage === "interviewing" || (stage === "next_question_loading" && !interviewHistory.find(h => h.question === currentQuestion && !!h.answer))) && (
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
                  <div className="flex items-center gap-2">
                    <Textarea 
                      placeholder={isListening ? "Listening... Speak clearly." : "Type or click mic to speak your answer..."}
                      rows={3} 
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="text-base flex-grow"
                      disabled={stage === "next_question_loading" || isListening || isAISpeaking}
                    />
                    {SpeechRecognition && (
                      <Button 
                        onClick={handleToggleListen} 
                        variant={isListening ? "destructive" : "outline"}
                        size="icon" 
                        disabled={stage === "next_question_loading" || isAISpeaking}
                        title={isListening ? "Stop Listening" : "Start Listening (Speak after clicking)"}
                      >
                        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                    )}
                  </div>
                  <Button 
                    onClick={handleNextQuestion} 
                    className="w-full md:w-auto mt-2"
                    disabled={stage === "next_question_loading" || !userAnswer.trim() || isListening || isAISpeaking}
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

      {stage === "final_feedback_display" && finalFeedback && (
        <Card className="flex-grow flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="font-headline text-2xl flex items-center">
                    <Award className="mr-2 text-primary h-7 w-7" /> Interview Report
                </CardTitle>
                <Button onClick={handleRestart} variant="outline">
                    Start New Interview
                </Button>
            </div>
            <CardDescription>
                {finalFeedback.closingRemark && <p className="italic mb-2">{finalFeedback.closingRemark}</p>}
                Here's your overall performance and detailed feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Card className="p-4 text-center col-span-1 md:col-span-1">
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className="text-5xl font-bold text-primary">{finalFeedback.overallScore}<span className="text-2xl text-muted-foreground">/100</span></p>
                </Card>
                <Card className="p-4 col-span-1 md:col-span-2">
                     <h3 className="font-headline text-lg font-semibold mb-2 flex items-center">
                        {finalFeedback.overallScore >= 80 ? <ThumbsUp className="mr-2 text-green-500" /> : finalFeedback.overallScore >=50 ? <Sparkles className="mr-2 text-yellow-500" /> : <ThumbsDown className="mr-2 text-red-500" />}
                        Overall Summary
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{finalFeedback.overallSummary}</p>
                </Card>
            </div>
            
            <Separator />

            <div>
                <h3 className="font-headline text-xl font-semibold mb-3">Detailed Question Feedback</h3>
                <ScrollArea className="h-[400px] pr-3">
                    <div className="space-y-4">
                    {finalFeedback.detailedFeedback.map((item, index) => (
                        <Card key={index} className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-primary">Question {index + 1}:</p>
                                    <p className="text-sm text-muted-foreground mb-1 whitespace-pre-wrap">{item.question}</p>
                                </div>
                                {item.questionScore !== undefined && (
                                    <div className="text-right ml-4">
                                        <p className="text-xs text-muted-foreground">Score</p>
                                        <p className="text-lg font-semibold text-primary">{item.questionScore}/10</p>
                                    </div>
                                )}
                            </div>
                            
                            <p className="font-semibold mt-2">Your Answer:</p>
                            <p className="text-sm mb-2 p-2 bg-primary/5 rounded whitespace-pre-wrap">{item.answer || <span className="italic text-muted-foreground">No answer provided.</span>}</p>
                            
                            <p className="font-semibold mt-2 flex items-center"><Sparkles className="mr-1 h-4 w-4 text-accent" />Specific Feedback:</p>
                            <p className="text-sm p-2 bg-secondary/30 rounded whitespace-pre-wrap">{item.specificFeedback}</p>
                        </Card>
                    ))}
                    {finalFeedback.detailedFeedback.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No questions were answered during the interview.</p>
                    )}
                    </div>
                </ScrollArea>
            </div>
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default MockInterviewPage;
