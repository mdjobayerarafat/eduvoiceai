
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Loader2, HelpCircle, Sparkles, FileText, ListOrdered } from "lucide-react";
import { account } from "@/lib/appwrite";
import type { Models } from "appwrite";
import { generateQuizQuestions } from "@/ai/flows/quiz-generation-flow";
import type { QuizGenerationInput, QuizGenerationOutput } from "@/ai/flows/quiz-generation-flow";

const QA_PREP_TOKEN_COST_PER_QUESTION = 100;

const qaPrepFormSchema = z.object({
  pdfFile: z
    .custom<FileList>((val) => val instanceof FileList, "PDF file is required.")
    .refine((files) => files.length > 0, `PDF file is required.`)
    .refine((files) => files.length <= 1, `Only one PDF file can be uploaded.`)
    .refine(
      (files) => files.length === 0 || files[0].size <= 10 * 1024 * 1024, // 10MB limit
      `PDF file size must be less than 10MB.`
    )
    .refine(
      (files) => files.length === 0 || files[0].type === "application/pdf",
      "File must be a PDF."
    ),
  numQuestions: z.enum(["10", "20", "30", "40", "50"], {
    required_error: "You need to select the number of questions.",
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
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(null);
  const [currentNumQuestions, setCurrentNumQuestions] = useState<string | null>(null);


  const form = useForm<QAPrepFormValues>({
    resolver: zodResolver(qaPrepFormSchema),
    defaultValues: {
      pdfFile: undefined,
      numQuestions: "10",
    },
  });

  async function onSubmit(values: QAPrepFormValues) {
    setIsLoading(true);
    setError(null);
    setGeneratedQuestions([]);
    setCurrentPdfName(null);
    setCurrentNumQuestions(null);

    let currentUser: Models.User<Models.Preferences> | null = null;
    try {
      currentUser = await account.get();
    } catch (authError) {
      toast({ title: "Authentication Error", description: "Could not verify user. Please log in again.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (!currentUser?.$id) {
      toast({ title: "Authentication Error", description: "User ID not found.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const userId = currentUser.$id;

    const pdfFile = values.pdfFile[0];
    setCurrentPdfName(pdfFile.name);
    setCurrentNumQuestions(values.numQuestions);

    const tokenCost = parseInt(values.numQuestions) * QA_PREP_TOKEN_COST_PER_QUESTION;

    try {
      const tokenResponse = await fetch('/api/user/deduct-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amountToDeduct: tokenCost,
          description: `Q&A Prep Quiz Generation: ${pdfFile.name} (${values.numQuestions} questions)`
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
      toast({
        title: "Token Error",
        description: `Could not process token deduction: ${tokenError.message}`,
        variant: "destructive",
      });
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
      numQuestions: parseInt(values.numQuestions),
      ...(userGeminiApiKey && { geminiApiKey: userGeminiApiKey }),
    };

    let generatedQuiz: QuizGenerationOutput | null = null;
    try {
      generatedQuiz = await generateQuizQuestions(quizInput);
      if (generatedQuiz && generatedQuiz.questions && generatedQuiz.questions.length > 0) {
        setGeneratedQuestions(generatedQuiz.questions);
        toast({
          title: "Quiz Generated!",
          description: `${generatedQuiz.questions.length} questions generated from "${pdfFile.name}".`,
        });
      } else {
        throw new Error("The AI did not return any questions. The PDF might be empty, unreadable, or the topic too narrow.");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during quiz generation.";
      setError(`Failed to generate quiz: ${errorMessage}`);
      toast({
        title: "Quiz Generation Failed",
        description: `Could not generate quiz. ${userGeminiApiKey ? "(Used your Gemini key). " : ""}Details: ${errorMessage.substring(0,150)}...`,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <HelpCircle className="mr-3 h-8 w-8 text-primary" /> AI-Powered Q&A Prep
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a PDF, select the number of questions, and let AI generate a quiz for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Generate Your Quiz</CardTitle>
          <CardDescription>
            Provide a PDF document and choose how many questions you want. 
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
                    <FormDescription>Max 10MB. Ensure the PDF contains selectable text.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Quiz...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Quiz</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle>Error Generating Quiz</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedQuestions.length > 0 && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
              <ListOrdered className="mr-2 h-6 w-6 text-primary" /> Generated Quiz Questions
            </CardTitle>
            <CardDescription>
              Topic: {currentPdfName} ({currentNumQuestions} Questions).
              <br />
              Next steps will include taking the quiz, getting scores, and detailed feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 list-decimal list-inside pl-4">
              {generatedQuestions.map((question, index) => (
                <li key={index} className="text-sm p-2 bg-muted/50 rounded-md">
                  {question}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card className="mt-6 bg-secondary/30 border-secondary">
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" /> Appwrite Database: `quiz_reports` Collection
            </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>For future development, you'll need to create a collection in Appwrite to store quiz results. Here's a suggested schema:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>**Collection Name:** `quiz_reports` (or similar)</li>
                <li>**Attributes:**
                    <ul>
                        <li>`userId` (String, Size: 36, Required)</li>
                        <li>`pdfFileName` (String, Size: 255)</li>
                        <li>`quizTitle` (String, Size: 255)</li>
                        <li>`numQuestionsSet` (Integer, Required) - Number of questions user selected</li>
                        <li>`numQuestionsGenerated` (Integer, Required) - Actual number of questions AI generated</li>
                        <li>`durationMinutes` (Integer, Required)</li>
                        <li>`overallScore` (Integer)</li>
                        <li>`maxScore` (Integer)</li>
                        <li>`overallFeedback` (String, Size: 1000000)</li>
                        <li>`questionDetails` (String, Size: 2000000, JSON of: questionText, userAnswer, correctAnswer, isCorrect, feedback, score)</li>
                        <li>`status` (String, Size: 50, Required, Default: "pending_evaluation")</li>
                        <li>`takenAt` (Datetime)</li>
                    </ul>
                </li>
                <li>**Permissions (Document Level):** `Role:user:{userId}` -&gt; Create, Read, Update, Delete</li>
                <li>**Permissions (Collection Level):** `Role:users` (Authenticated) -&gt; Create</li>
            </ul>
            <p className="font-semibold text-foreground mt-2">This schema is a guide and will be used when we implement quiz taking and saving results.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    