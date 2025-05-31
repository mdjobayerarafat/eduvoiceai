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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopicLectureInput } from "@/ai/flows/topic-lecture-flow";
import { Sparkles } from "lucide-react";

const formSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(200, { message: "Topic must be at most 200 characters." }),
  userAPIKey: z.string().optional(), // For future use
});

interface TopicSelectionFormProps {
  onSubmitTopic: (data: TopicLectureInput) => Promise<void>;
  isGenerating: boolean;
}

export function TopicSelectionForm({ onSubmitTopic, isGenerating }: TopicSelectionFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      userAPIKey: "",
    },
  });

  function handleSubmit(values: z.infer<typeof formSchema>) {
    onSubmitTopic(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Generate a Lecture</CardTitle>
        <CardDescription>Enter a topic and let our AI create a comprehensive lecture for you, complete with summaries, explanations, and relevant videos.</CardDescription>
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Placeholder for API Key input if needed in future */}
            {/* <FormField
              control={form.control}
              name="userAPIKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your API Key (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your API key if you have one" {...field} />
                  </FormControl>
                  <FormDescription>Provide your own API key for potentially enhanced results.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            /> */}
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