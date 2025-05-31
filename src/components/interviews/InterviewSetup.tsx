
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { mockInterview } from "@/ai/flows/mock-interview-flow";
import type { MockInterviewInput } from "@/ai/flows/mock-interview-flow";
import { Loader2, Sparkles } from "lucide-react";

const formSchema = z.object({
  jobDescription: z.string().min(50, {
    message: "Job description must be at least 50 characters.",
  }).max(5000, {
    message: "Job description must be at most 5000 characters.",
  }),
  resume: z
    .custom<FileList>((val) => val instanceof FileList, "Resume is required.")
    .refine((files) => files.length > 0, `Resume is required.`)
    .refine((files) => files.length <= 1, `Only one resume can be uploaded.`)
    .refine(
      (files) => files.length === 0 || files[0].size <= 5 * 1024 * 1024, // 5MB limit
      `Resume file size must be less than 5MB.`
    )
    .refine(
      (files) =>
        files.length === 0 ||
        ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(files[0].type),
      "Resume must be a PDF, TXT, or DOCX file."
    ),
});

type InterviewSetupFormValues = z.infer<typeof formSchema>;

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

export function InterviewSetup() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  // const [interviewData, setInterviewData] = useState<MockInterviewInput | null>(null);


  const form = useForm<InterviewSetupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobDescription: "",
      resume: undefined,
    },
  });

  async function onSubmit(values: InterviewSetupFormValues) {
    setIsProcessing(true);
    toast({
      title: "Processing Setup",
      description: "Preparing your interview session...",
    });

    try {
      const resumeFile = values.resume[0];
      const resumeDataUri = await fileToDataUri(resumeFile);

      const setupData: Omit<MockInterviewInput, 'userResponses'> = {
        jobDescription: values.jobDescription,
        resume: resumeDataUri,
      };
      
      console.log("Interview Setup Data:", setupData);

      // At this point, we have the JD and resume.
      // The current `mockInterview` flow expects `userResponses`, which we don't have yet.
      // For a real application, you might:
      // 1. Store `setupData` (e.g., in state, context, or backend).
      // 2. Navigate to a new page/view where the AI asks the first question.
      // 3. Collect responses, then finally call `mockInterview` with all data.

      // For now, we'll simulate this completion and show a success message.
      // In a future step, this could trigger the first question generation.
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing

      toast({
        title: "Setup Complete!",
        description: "Your mock interview is ready to begin (simulation). Next step would be the actual interview.",
      });
      
      // Example: Store in session storage and navigate
      // sessionStorage.setItem('interviewSetup', JSON.stringify(setupData));
      // router.push('/interviews/session'); // Hypothetical session page

    } catch (error) {
      console.error("Error processing interview setup:", error);
      toast({
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during setup.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="jobDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Paste the job description here..."
                  rows={10}
                  {...field}
                  disabled={isProcessing}
                />
              </FormControl>
              <FormDescription>
                Provide the full job description for the role you're practicing for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resume"
          render={({ field: { onChange, value, ...restField } }) => (
            <FormItem>
              <FormLabel>Upload Resume</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => onChange(e.target.files)}
                  {...restField}
                  disabled={isProcessing}
                />
              </FormControl>
              <FormDescription>
                Upload your resume (PDF, TXT, or DOCX, max 5MB).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isProcessing} className="w-full md:w-auto">
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Start Interview Setup
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
