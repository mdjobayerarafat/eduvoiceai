"use client";

import { useState } from "react";
import { TopicSelectionForm } from "@/components/lectures/TopicSelectionForm";
import { LectureDisplay } from "@/components/lectures/LectureDisplay";
import { generateTopicLecture } from "@/ai/flows/topic-lecture-flow";
import type { TopicLectureInput, TopicLectureOutput } from "@/ai/flows/topic-lecture-flow";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function LecturesPage() {
  const [lecture, setLecture] = useState<TopicLectureOutput | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmitTopic = async (data: TopicLectureInput) => {
    setIsGenerating(true);
    setError(null);
    setLecture(null);
    setCurrentTopic(data.topic);

    try {
      const result = await generateTopicLecture(data);
      setLecture(result);
      toast({
        title: "Lecture Generated!",
        description: `Your lecture on "${data.topic}" is ready.`,
      });
    } catch (err) {
      console.error("Error generating lecture:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate lecture: ${errorMessage}`);
      toast({
        title: "Generation Failed",
        description: `Could not generate lecture for "${data.topic}". Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold">AI Topic-Based Lectures</h1>
        <p className="text-muted-foreground mt-1">
          Let AI craft detailed lectures on any subject you're curious about.
        </p>
      </div>
      
      <TopicSelectionForm onSubmitTopic={handleSubmitTopic} isGenerating={isGenerating} />

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isGenerating && !lecture && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Generating your lecture on "{currentTopic}"...</p>
        </div>
      )}

      {lecture && currentTopic && (
        <LectureDisplay lecture={lecture} topic={currentTopic}