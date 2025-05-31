
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { account, databases, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Lecture } from "@/types/lecture";
import { LectureDisplay } from "@/components/lectures/LectureDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, BookOpen, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ViewLecturePage() {
  const params = useParams();
  const lectureId = params.lectureId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lectureId) {
      setError("Lecture ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchLecture = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Check if user is authenticated
        await account.get(); 
        
        // Appwrite's document-level permissions will ensure only the owner can read.
        // If not owner, databases.getDocument will throw an error (403/404).
        const document = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          LECTURES_COLLECTION_ID,
          lectureId
        );
        setLecture(document as Lecture);
      } catch (err: any) {
        console.error("Error fetching lecture:", err);
        if (err instanceof AppwriteException) {
          if (err.code === 401 || err.type === 'user_unauthorized' || err.type === 'general_unauthorized_scope') {
            toast({ title: "Authentication Error", description: "Please log in to view this lecture.", variant: "destructive" });
            router.push('/login');
            return;
          } else if (err.code === 404 || err.type === 'document_not_found') {
            setError("Lecture not found. It may have been deleted or you may not have permission to view it.");
            toast({ title: "Not Found", description: "This lecture could not be found.", variant: "destructive" });
          } else if (err.code === 403 || err.type === 'user_forbidden' ) {
             setError("You do not have permission to view this lecture.");
             toast({ title: "Access Denied", description: "You are not authorized to view this lecture.", variant: "destructive" });
          } else {
            setError(`Could not load lecture: ${err.message}`);
            toast({ title: "Error", description: `Failed to load lecture: ${err.message.substring(0,100)}`, variant: "destructive" });
          }
        } else {
          setError("An unexpected error occurred while fetching the lecture.");
          toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLecture();
  }, [lectureId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading lecture...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="font-headline text-3xl font-semibold flex items-center">
                <BookOpen className="mr-3 h-8 w-8 text-destructive" /> Error Loading Lecture
            </h1>
             <Button variant="outline" asChild>
                <Link href="/lectures/history">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lecture Library
                </Link>
            </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Loading Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h1 className="font-headline text-3xl font-semibold">Lecture Not Found</h1>
             <Button variant="outline" asChild>
                <Link href="/lectures/history">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lecture Library
                </Link>
            </Button>
        </div>
        <Card className="text-center py-12">
            <CardHeader>
                <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <CardTitle>Oops! Lecture not available.</CardTitle>
                <CardDescription>We couldn't find the lecture you were looking for.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  // Construct TopicLectureOutput from the fetched Lecture document
  const lectureOutputForDisplay = {
    lectureContent: lecture.lectureContent,
    summary: lecture.summary,
    youtubeVideoLinks: lecture.youtubeVideoLinks || [],
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="font-headline text-3xl font-semibold line-clamp-2">
                Viewing Lecture: {lecture.topic}
            </h1>
            <Button variant="outline" asChild>
                <Link href="/lectures/history">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lecture Library
                </Link>
            </Button>
        </div>
        <LectureDisplay lecture={lectureOutputForDisplay} topic={lecture.topic} />
    </div>
  );
}
