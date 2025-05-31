
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { Loader2, AlertTriangle, Video, VideoOff, MessageSquare, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InterviewStage = "setup" | "first_question_loading" | "interviewing" | "next_question_loading" | "error";

interface InterviewExchange {
  question: string;
  answer: string;
  feedback?: string;
}

// Check for SpeechRecognition and SpeechSynthesis API
const SpeechRecognition = (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
const speechSynthesis = (typeof window !== 'undefined' && window.speechSynthesis) || null;


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

  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const speakText = useCallback((text: string) => {
    if (!speechSynthesis || !isTTSEnabled || !text) return;
    try {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel(); // Cancel any ongoing speech
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsAISpeaking(true);
      utterance.onend = () => setIsAISpeaking(false);
      utterance.onerror = (event) => {
        console.error("SpeechSynthesisUtterance.onerror", event);
        setIsAISpeaking(false);
        toast({ title: "Speech Error", description: "Could not play AI voice.", variant: "destructive"});
      };
      speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Error in speakText:", e);
      setIsAISpeaking(false);
      toast({ title: "Speech Error", description: "Could not play AI voice.", variant: "destructive"});
    }
  }, [isTTSEnabled, toast]);

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
      recognition.continuous = false; // Process speech after a pause
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        let errorMsg = "Speech recognition error. Please try again.";
        if (event.error === 'no-speech') {
            errorMsg = "No speech detected. Please try again.";
        } else if (event.error === 'audio-capture') {
            errorMsg = "Microphone error. Please check your microphone.";
        } else if (event.error === 'not-allowed') {
            errorMsg = "Microphone access denied. Please allow microphone access.";
        }
        toast({ title: "Voice Input Error", description: errorMsg, variant: "destructive" });
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setUserAnswer(prev => prev.substring(0, prev.length - interimTranscript.length) + finalTranscript + interimTranscript);
         // If final, update userAnswer and stop listening for this phrase
        if (finalTranscript.trim()) {
            setUserAnswer(prev => {
                // Remove the interim part and keep the final
                const currentInterimGuess = interimTranscript.trim() ? interimTranscript : "";
                if (prev.endsWith(currentInterimGuess)) {
                    return prev.slice(0, -currentInterimGuess.length) + finalTranscript.trim();
                }
                return prev + finalTranscript.trim();
            });
        }
      };
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, [toast]);


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
      speakText(result.firstQuestion);
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
      // Clear previous answer before starting new recognition if desired
      // setUserAnswer(""); 
      try {
        recognitionRef.current.start();
      } catch (e) {
         console.error("Error starting recognition:", e);
         setIsListening(false);
         let errorMsg = "Could not start voice input. ";
         // Attempt to infer permission issue, though specific error codes are better
         if (e instanceof Error && (e.name === 'NotAllowedError' || e.message.includes('permission'))) {
            errorMsg += "Please allow microphone access in browser settings.";
         } else {
            errorMsg += "Please check your microphone.";
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
    if (isListening) {
        recognitionRef.current?.stop();
    }
    if (speechSynthesis?.speaking) {
        speechSynthesis.cancel();
    }

    setStage("next_question_loading");
    setError(null);

    const currentExchange: InterviewExchange = { question: currentQuestion, answer: userAnswer };
    // Add current exchange to history immediately for UI update, feedback will be added later
    setInterviewHistory(prev => [...prev, currentExchange]);
    
    try {
      const input: InterviewProgressionInput = {
        resume: interviewConfig.resume,
        jobDescription: interviewConfig.jobDescription,
        interviewHistory: [...interviewHistory, { question: currentQuestion, answer: userAnswer }], // Send the latest answer with the history
      };
      const result: InterviewProgressionOutput = await getFeedbackAndNextQuestion(input);
      
      setInterviewHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) { // The last item is the one just added, update its feedback
              newHistory[newHistory.length -1].feedback = result.feedbackOnLastAnswer;
          }
          return newHistory;
      });
      speakText(result.feedbackOnLastAnswer);
      // Wait for feedback to finish speaking (or a short delay) before asking the next question
      setTimeout(() => {
          setCurrentQuestion(result.nextQuestion);
          speakText(result.nextQuestion);
      }, result.feedbackOnLastAnswer.length > 0 && isTTSEnabled ? 100 + result.feedbackOnLastAnswer.length * 60 : 0); // Rough estimate for speech duration

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
      setStage("error"); 
      toast({
        title: "Error Processing Answer",
        description: "Could not get feedback or the next question. Please try again if the issue persists.",
        variant: "destructive",
      });
       // Ensure AI speaking state is reset on error
      setIsAISpeaking(false);
    }
  };

  const toggleTTS = () => {
    setIsTTSEnabled(prev => {
      if (prev && speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
        setIsAISpeaking(false);
      }
      return !prev;
    });
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]"> {/* Adjust height based on header/paddings */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-headline text-3xl font-semibold">Mock Interview</h1>
            <p className="text-muted-foreground mt-1">
              {stage === "setup" && "Practice your interviewing skills. Provide the job details and your resume."}
              {(stage === "first_question_loading" || stage === "next_question_loading") && "Processing..."}
              {stage === "interviewing" && "You're live! Answer the question below."}
              {stage === "error" && "An error occurred."}
            </p>
          </div>
          {(stage === "interviewing" || stage === "next_question_loading") && (
             <Button onClick={toggleTTS} variant="outline" size="icon" title={isTTSEnabled ? "Mute AI Voice" : "Unmute AI Voice"}>
                {isTTSEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
          )}
        </div>
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
            {hasCameraPermission === null && stage === "interviewing" && ( 
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
                {isAISpeaking && <Volume2 className="ml-2 h-5 w-5 text-accent animate-pulse" />}
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
                  {currentQuestion && (stage === "interviewing" || stage === "next_question_loading" && !interviewHistory.find(h => h.question === currentQuestion)) && (
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
                      placeholder={isListening ? "Listening..." : "Type or speak your answer here..."}
                      rows={4} 
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="text-base flex-grow"
                      disabled={stage === "next_question_loading" || isListening}
                    />
                    {SpeechRecognition && (
                      <Button 
                        onClick={handleToggleListen} 
                        variant="outline" 
                        size="icon" 
                        disabled={stage === "next_question_loading" || isAISpeaking}
                        title={isListening ? "Stop Listening" : "Start Listening"}
                        className={isListening ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
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
    </div>
  );
}

export default MockInterviewPage;

    