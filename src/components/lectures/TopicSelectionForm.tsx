
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

// This schema is now only for the form itself
const formSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(200, { message: "Topic must be at most 200 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

interface TopicSelectionFormProps {
  onSubmitTopic: (data: FormValues) => Promise<void>; // Changed to simpler data type
  isGenerating: boolean;
}

export function TopicSelectionForm({ onSubmitTopic, isGenerating }: TopicSelectionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmitTopic(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Generate a Lecture</CardTitle>
        <CardDescription>Enter a topic and let our AI create a comprehensive lecture for you, complete with summaries, explanations, and relevant videos. You can also provide your own Gemini API key in settings for this.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lecture Topic</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'The Future of Renewable Energy', 'Introduction to Machine Learning', 'The French Revolution'"
                      {...field}
                      rows={3}
                      disabled={isGenerating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full md:w-auto" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Lecture"}
              {!isGenerating && <Sparkles className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
