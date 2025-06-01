
"use client";

import { useState } from "react";
import Link from "next/link";
import { TopicSelectionForm } from "@/components/lectures/TopicSelectionForm";
import { LectureDisplay } from "@/components/lectures/LectureDisplay";
import { generateTopicLecture } from "@/ai/flows/topic-lecture-flow";
import type { TopicLectureInput, TopicLectureOutput } from "@/ai/flows/topic-lecture-flow";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Terminal, Save, AlertTriangle } from "lucide-react";
import { account, databases, ID, Permission, Role, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID } from "@/lib/appwrite";
import { AppwriteException, Models } from "appwrite";
import type { Lecture } from "@/types/lecture";


const LECTURE_TOKEN_COST = 500;

export default function LecturesPage() {
  const [lectureOutput, setLectureOutput] = useState<TopicLectureOutput | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmitTopic = async (data: TopicLectureInput) => {
    setIsGenerating(true);
    setError(null);
    setLectureOutput(null);
    setCurrentTopic(data.topic);

    let currentUser: Models.User<Models.Preferences> | null = null;
    try {
      currentUser = await account.get();
    } catch (authError) {
      toast({ title: "Authentication Error", description: "Could not verify user. Please log in again.", variant: "destructive" });
      setIsGenerating(false);
      return;
    }

    if (!currentUser?.$id) {
      toast({ title: "Authentication Error", description: "User ID not found.", variant: "destructive" });
      setIsGenerating(false);
      return;
    }
    const userId = currentUser.$id;

    // 1. Deduct tokens
    try {
      const tokenResponse = await fetch('/api/user/deduct-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          amountToDeduct: LECTURE_TOKEN_COST,
          description: `Lecture generation: ${data.topic}`
        }),
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResponse.ok) {
        if (tokenResponse.status === 402 && tokenResult.canSubscribe) { // 402 Payment Required
          toast({
            title: "Insufficient Tokens",
            description: `${tokenResult.message || `You need ${LECTURE_TOKEN_COST} tokens to generate a lecture.`} You have ${tokenResult.currentTokenBalance || 0}.`,
            variant: "destructive",
            action: <Button variant="outline" size="sm" asChild><Link href="/settings/subscription">Get More Tokens</Link></Button>,
            duration: 7000,
          });
        } else {
          throw new Error(tokenResult.message || "Failed to deduct tokens.");
        }
        setIsGenerating(false);
        return;
      }
      
      // Token deduction successful (or skipped for pro user)
      toast({
        title: tokenResult.message.includes("skipped") ? "Pro User" : "Tokens Deducted",
        description: tokenResult.message.includes("skipped") ? `Lecture generation for "${data.topic}" started.` : `Successfully deducted ${tokenResult.deductedAmount} tokens. New balance: ${tokenResult.newTokenBalance}. Generating lecture...`,
      });

    } catch (tokenError: any) {
      setError(`Token deduction failed: ${tokenError.message}`);
      toast({
        title: "Token Error",
        description: `Could not process token deduction for lecture generation: ${tokenError.message}`,
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    // 2. Generate lecture if token deduction was successful
    let generatedLecture: TopicLectureOutput | null = null;
    try {
      generatedLecture = await generateTopicLecture(data);
      setLectureOutput(generatedLecture);
      toast({
        title: "Lecture Generated!",
        description: `Your lecture on "${data.topic}" is ready. You can now save it.`,
      });
    } catch (err) {
      console.error("Error generating lecture:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during generation.";
      setError(`Failed to generate lecture: ${errorMessage}`);
      toast({
        title: "Generation Failed",
        description: `Could not generate lecture for "${data.topic}". Please try again.`,
        variant: "destructive",
      });
      // Consider refunding tokens if generation fails after deduction - advanced feature
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLecture = async () => {
    if (!lectureOutput || !currentTopic) {
      toast({ title: "No lecture to save", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const user = await account.get();
      if (!user || !user.$id) {
        throw new Error("User not authenticated.");
      }
      const userId = user.$id;

      const lectureDataToSave = {
        userId: userId,
        topic: currentTopic,
        lectureContent: lectureOutput.lectureContent,
        summary: lectureOutput.summary,
        youtubeVideoLinks: lectureOutput.youtubeVideoLinks || [],
      };

      if (!APPWRITE_DATABASE_ID || !LECTURES_COLLECTION_ID) {
        throw new Error("Appwrite database/collection IDs are not configured. Check .env file.");
      }

      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        LECTURES_COLLECTION_ID,
        ID.unique(),
        lectureDataToSave,
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );

      toast({
        title: "Lecture Saved!",
        description: `Your lecture on "${currentTopic}" has been saved successfully.`,
        action: <Save className="h-5 w-5 text-green-500" />
      });
    } catch (err) {
      console.error("Error saving lecture:", err);
      let errorMessage = "An unknown error occurred while saving.";
      if (err instanceof AppwriteException) {
        errorMessage = `Appwrite Error: ${err.message} (Code: ${err.code}, Type: ${err.type})`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(`Failed to save lecture: ${errorMessage}`);
      toast({
        title: "Save Failed",
        description: `Could not save lecture: ${errorMessage.substring(0,100)}...`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold">AI Topic-Based Lectures</h1>
        <p className="text-muted-foreground mt-1">
          Let AI craft detailed lectures on any subject you're curious about. Generating a lecture costs {LECTURE_TOKEN_COST} tokens.
        </p>
      </div>
      
      <TopicSelectionForm onSubmitTopic={handleSubmitTopic} isGenerating={isGenerating || isSaving} />

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isGenerating && !lectureOutput && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Processing token deduction and generating your lecture on "{currentTopic}"...</p>
        </div>
      )}

      {lectureOutput && currentTopic && (
        <>
          <LectureDisplay lecture={lectureOutput} topic={currentTopic} />
          <div className="text-center mt-6">
            <Button onClick={handleSaveLecture} disabled={isSaving || isGenerating} size="lg">
              {isSaving ? (
                <><Terminal className="mr-2 h-4 w-4 animate-spin" />Saving Lecture...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Lecture to My Library</>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
