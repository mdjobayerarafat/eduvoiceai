
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { account, databases, Query, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID } from "@/lib/appwrite";
import type { Lecture } from "@/types/lecture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen, AlertTriangle, Loader2, PlusCircle, History, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

export default function LectureHistoryPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLectures = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await account.get();
        if (!user?.$id) {
          throw new Error("User not authenticated. Please log in.");
        }

        if (!APPWRITE_DATABASE_ID || !LECTURES_COLLECTION_ID) {
          setError("Appwrite database/collection IDs are not configured in your environment variables.");
          setIsLoading(false);
          return;
        }

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          LECTURES_COLLECTION_ID,
          [
            Query.equal("userId", user.$id),
            Query.orderDesc("$createdAt"), // Show newest first
            Query.limit(50) // Fetch up to 50 lectures
          ]
        );
        setLectures(response.documents as Lecture[]);
      } catch (err: any) {
        console.error("Error fetching lectures:", err);
        let errorMessage = "Could not fetch your saved lectures.";
        if (err.message) {
            errorMessage = err.message;
        }
        if (err.code === 401 && err.type === 'user_unauthorized') {
            errorMessage = "You are not authorized to view these lectures or your session might have expired. Please try logging in again.";
        } else if (err.message?.includes("configured")) {
             errorMessage = err.message; // Show specific config error
        }
        setError(errorMessage);
        toast({
          title: "Error Fetching Lectures",
          description: errorMessage.substring(0,150),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLectures();
  }, [toast]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-semibold flex items-center">
            <History className="mr-3 h-8 w-8 text-primary" /> Your Lecture Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Review lectures you've generated and saved.
          </p>
        </div>
        <Button asChild>
          <Link href="/lectures">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Lecture
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Loading Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your saved lectures...</p>
        </div>
      )}

      {!isLoading && !error && lectures.length === 0 && (
        <Card className="text-center py-12">
          <CardHeader>
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="font-headline text-2xl">No Lectures Saved Yet</CardTitle>
            <CardDescription>
              You haven't saved any lectures. Generate one to get started!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/lectures">Generate Your First Lecture</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && lectures.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lectures.map((lecture) => (
            <Card key={lecture.$id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-xl line-clamp-2">{lecture.topic}</CardTitle>
                <CardDescription>
                  Saved {formatDistanceToNow(new Date(lecture.$createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {lecture.summary || "No summary available."}
                </p>
              </CardContent>
              <CardFooter>
                {/* In a future step, this could link to a detailed view page for this specific lecture */}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/lectures/view/${lecture.$id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Lecture
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
