
"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle, Sparkles, FileText, ListOrdered, AlertTriangle, PlayCircle, RotateCcw, Clock, History } from "lucide-react";
import { account, APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, databases, ID, Permission, Role } from "@/lib/appwrite";
import { Models, AppwriteException } from "appwrite";
import { generateQuizQuestions } from "@/ai/flows/quiz-generation-flow";
import type { QuizGenerationInput, QuizGenerationOutput } from "@/ai/flows/quiz-generation-flow";
import type { QAReport } from "@/types/qaReport";

const QA_PREP_TOKEN_COST_PER_QUESTION = 100;
const PDF_MAX_SIZE_MB = 2; // Reduced from 10MB to 2MB

const qaPrepFormSchema = z.object({
  pdfFile: z
    .custom<FileList>((val) => val instanceof FileList, "PDF file is required.")
    .refine((files) => files.length > 0, `PDF file is required.`)
    .refine((files) => files.length <= 1, `Only one PDF file can be uploaded.`)
    .refine(
      (files) => files.length === 0 || files[0].size <= PDF_MAX_SIZE_MB * 1024 * 1024,
      `PDF file size must be less than ${PDF_MAX_SIZE_MB}MB.`
    )
    .refine(
      (files) => files.length === 0 || files[0].type === "application/pdf",
      "File must be a PDF."
    ),
  numQuestions: z.enum(["10", "20", "30", "40", "50"], {
    required_error: "You need to select the number of questions.",
  }),
  duration: z.enum(["10", "20", "30", "40", "50"], {
    required_error: "You need to select the exam duration.",
  }),
});

type QAPrepFormValues = z.infer<typeof qaPrepFormSchema>;

async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QAPrepPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [quizReady, setQuizReady] = useState(false);
  const [currentQuizReport, setCurrentQuizReport] = useState<QAReport | null>(null);
  const [generatedQuestionsForDisplay, setGeneratedQuestionsForDisplay] = useState<string[]>([]);
  const [generatedAnswersForDisplay, setGeneratedAnswersForDisplay] = useState<string[]>([]);


  const form = useForm<QAPrepFormValues>({
    resolver: zodResolver(qaPrepFormSchema),
    defaultValues: {
      pdfFile: undefined,
      numQuestions: "10",
      duration: "10",
    },
  });

  async function onSubmit(values: QAPrepFormValues) {
    setIsLoading(true);
    setError(null);
    setQuizReady(false);
    setCurrentQuizReport(null);
    setGeneratedQuestionsForDisplay([]);
    setGeneratedAnswersForDisplay([]);

    let currentUser: Models.User<Models.Preferences>;
    try {
      currentUser = await account.get();
      if (!currentUser?.$id) {
        toast({ title: "Authentication Error", description: "User ID not found. Please ensure you are logged in.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    } catch (authError) {
      toast({ title: "Authentication Error", description: "Could not verify user. Please log in again.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const userId = currentUser.$id; 

    const pdfFile = values.pdfFile[0];
    const numQuestionsSelected = parseInt(values.numQuestions);
    const durationSelected = parseInt(values.duration);
    const tokenCost = numQuestionsSelected * QA_PREP_TOKEN_COST_PER_QUESTION;

    try {
      const tokenResponse = await fetch('/api/user/deduct-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          amountToDeduct: tokenCost,
          description: `Q&A Prep Quiz Generation: ${pdfFile.name} (${numQuestionsSelected} questions)`
        }),
      });
      const tokenResult = await tokenResponse.json();
      if (!tokenResponse.ok) {
        if (tokenResponse.status === 402 && tokenResult.canSubscribe) {
          toast({
            title: "Insufficient Tokens",
            description: `${tokenResult.message || `You need ${tokenCost} tokens for this quiz.`} You have ${tokenResult.currentTokenBalance || 0}.`,
            variant: "destructive",
            action: <Button variant="outline" size="sm" asChild><Link href="/settings/subscription">Get More Tokens</Link></Button>,
            duration: 7000,
          });
        } else {
          throw new Error(tokenResult.message || "Failed to deduct tokens.");
        }
        setIsLoading(false);
        return;
      }
      toast({
        title: tokenResult.message.includes("skipped") ? "Pro User" : "Tokens Deducted",
        description: tokenResult.message.includes("skipped") ? `Quiz generation for "${pdfFile.name}" started.` : `Successfully deducted ${tokenResult.deductedAmount} tokens. New balance: ${tokenResult.newTokenBalance}. Generating quiz...`,
      });
    } catch (tokenError: any) {
      setError(`Token deduction failed: ${tokenError.message}`);
      toast({ title: "Token Error", description: `Could not process token deduction: ${tokenError.message}`, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    let pdfDataUri: string;
    try {
      pdfDataUri = await fileToDataUri(pdfFile);
    } catch (fileError: any) {
      setError(`Failed to read PDF file: ${fileError.message}`);
      toast({ title: "File Error", description: "Could not process the uploaded PDF.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    let userGeminiApiKey: string | undefined = undefined;
    try {
      const savedKeysRaw = localStorage.getItem("eduvoice_api_keys");
      if (savedKeysRaw) {
        const savedKeys = JSON.parse(savedKeysRaw);
        userGeminiApiKey = savedKeys.geminiApiKey;
      }
    } catch (e) { console.warn("Could not read API keys from localStorage", e); }

    const quizInput: QuizGenerationInput = {
      pdfDataUri,
      numQuestions: numQuestionsSelected,
      ...(userGeminiApiKey && { geminiApiKey: userGeminiApiKey }),
    };

    try {
      const generatedQuizOutput: QuizGenerationOutput = await generateQuizQuestions(quizInput);
      if (!generatedQuizOutput || !generatedQuizOutput.questions || generatedQuizOutput.questions.length === 0 || !generatedQuizOutput.correctAnswers || generatedQuizOutput.correctAnswers.length === 0) {
        throw new Error("The AI did not return any questions or answers. The PDF might be empty, unreadable, or the topic too narrow. If the AI service is overloaded, please try again later.");
      }
      if (generatedQuizOutput.questions.length !== generatedQuizOutput.correctAnswers.length) {
        console.warn("Mismatch between number of generated questions and answers. AI might have had an issue. Proceeding with available data.");
      }
      
      setGeneratedQuestionsForDisplay(generatedQuizOutput.questions); 
      setGeneratedAnswersForDisplay(generatedQuizOutput.correctAnswers);

      if (!APPWRITE_DATABASE_ID || !QA_REPORTS_COLLECTION_ID) {
        throw new Error("Appwrite DB/Collection ID for QA reports is not configured.");
      }

      const quizReportDataToSave: Omit<QAReport, keyof Models.Document | '$permissions' | '$databaseId' | '$collectionId'> = {
        userId: userId,
        pdfFileName: pdfFile.name,
        pdfDataUri: pdfDataUri, 
        quizTitle: generatedQuizOutput.extractedTopicGuess || `Quiz from ${pdfFile.name}`,
        numQuestionsSet: numQuestionsSelected,
        numQuestionsGenerated: generatedQuizOutput.questions.length,
        durationMinutes: durationSelected,
        generatedQuestions: JSON.stringify(generatedQuizOutput.questions),
        generatedCorrectAnswers: JSON.stringify(generatedQuizOutput.correctAnswers),
        status: "generated",
      };

      const createdDocument = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        QA_REPORTS_COLLECTION_ID,
        ID.unique(),
        quizReportDataToSave,
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );
      
      setCurrentQuizReport(createdDocument as QAReport);
      setQuizReady(true);
      form.reset(); 

      toast({
        title: "Quiz Generated & Saved!",
        description: `${generatedQuizOutput.questions.length} questions and answers generated for "${pdfFile.name}" and saved. Ready to start.`,
      });

    } catch (err) {
      console.error("Error generating or saving quiz:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during quiz processing.";
      setError(`Quiz generation/saving failed: ${errorMessage}`);
      toast({
        title: "Quiz Preparation Failed",
        description: `Could not prepare quiz. ${userGeminiApiKey ? "(Used your Gemini key). " : ""}Details: ${errorMessage.substring(0,150)}... If the error mentions service overload, please try again in a few moments.`,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleGenerateNewQuiz = () => {
    setQuizReady(false);
    setCurrentQuizReport(null);
    setError(null);
    setGeneratedQuestionsForDisplay([]);
    setGeneratedAnswersForDisplay([]);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-semibold flex items-center">
            <HelpCircle className="mr-3 h-8 w-8 text-primary" /> AI-Powered Q&A Prep
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload a PDF, select settings, and let AI generate a quiz with questions and correct answers. Then, take the exam!
          </p>
        </div>
        {!quizReady && (
          <Button variant="outline" asChild>
            <Link href="/qa-prep/history">
              <History className="mr-2 h-4 w-4" /> View My Quizzes
            </Link>
          </Button>
        )}
      </div>


      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle>Error During Quiz Preparation</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!quizReady && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Generate Your Quiz</CardTitle>
            <CardDescription>
              Provide a PDF (max {PDF_MAX_SIZE_MB}MB), choose the number of questions and exam duration.
              Cost: {QA_PREP_TOKEN_COST_PER_QUESTION} tokens per question.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="pdfFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload PDF Document</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => field.onChange(e.target.files)}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>Max {PDF_MAX_SIZE_MB}MB. Ensure the PDF contains selectable text.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numQuestions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Questions</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select number of questions" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[10, 20, 30, 40, 50].map(num => (
                              <SelectItem key={num} value={String(num)}>
                                {num} Questions (Cost: {(num * QA_PREP_TOKEN_COST_PER_QUESTION).toLocaleString()} tokens)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Duration</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exam duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[10, 20, 30, 40, 50].map(num => (
                              <SelectItem key={num} value={String(num)}>
                                {num} Minutes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Quiz...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Quiz & Answers</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {quizReady && currentQuizReport && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
              <ListOrdered className="mr-2 h-6 w-6 text-primary" /> Quiz Ready!
            </CardTitle>
            <CardDescription>
              Your quiz based on "{currentQuizReport.pdfFileName || currentQuizReport.quizTitle}" is prepared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p><strong>Title:</strong> {currentQuizReport.quizTitle}</p>
              <p><strong>Questions:</strong> {currentQuizReport.numQuestionsGenerated}</p>
              <p><strong>Duration:</strong> {currentQuizReport.durationMinutes} minutes</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="flex-1">
                <Link href={`/qa-prep/exam/${currentQuizReport.$id}`}>
                    <PlayCircle className="mr-2 h-5 w-5" /> Start Exam
                </Link>
              </Button>
              <Button onClick={handleGenerateNewQuiz} variant="outline" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" /> Generate New Quiz
              </Button>
            </div>
             {(generatedQuestionsForDisplay.length > 0 || generatedAnswersForDisplay.length > 0) && (
                <div className="mt-4 pt-4 border-t">
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Generated Content (Preview):</h3>
                    {generatedQuestionsForDisplay.length > 0 && (
                        <>
                        <p className="text-xs font-medium">Questions:</p>
                        <ul className="space-y-1 list-decimal list-inside pl-4 max-h-32 overflow-y-auto text-xs">
                            {generatedQuestionsForDisplay.slice(0, 3).map((q, i) => <li key={`q-${i}`} className="truncate">{q}</li>)}
                            {generatedQuestionsForDisplay.length > 3 && <li>...and {generatedQuestionsForDisplay.length - 3} more.</li>}
                        </ul>
                        </>
                    )}
                    {generatedAnswersForDisplay.length > 0 && (
                         <>
                        <p className="text-xs font-medium mt-2">Correct Answers:</p>
                        <ul className="space-y-1 list-decimal list-inside pl-4 max-h-32 overflow-y-auto text-xs">
                            {generatedAnswersForDisplay.slice(0, 3).map((a, i) => <li key={`a-${i}`} className="truncate">{a}</li>)}
                            {generatedAnswersForDisplay.length > 3 && <li>...and {generatedAnswersForDisplay.length - 3} more.</li>}
                        </ul>
                        </>
                    )}
                </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card className="mt-6 bg-secondary/30 border-secondary">
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" /> Appwrite Database: qa_reports
            </CardTitle>
            <CardDescription>
              Collection Name: <strong>qa_reports</strong> (ID: <strong>{QA_REPORTS_COLLECTION_ID}</strong>)
            </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>This feature saves generated quizzes to the <strong>qa_reports</strong> collection. The schema includes attributes like:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>`userId`, `pdfFileName`, `pdfDataUri`, `quizTitle`, `numQuestionsSet`, `numQuestionsGenerated`, `durationMinutes`, `generatedQuestions` (JSON string), `generatedCorrectAnswers` (JSON string), `status`.</li>
                <li>After exam completion: `overallScore`, `maxScore`, `overallFeedback`, `userAnswersAndFeedback` (JSON string), `startedAt`, `completedAt`.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
