
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { account, databases, Query, APPWRITE_DATABASE_ID, INTERVIEWS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { InterviewReport } from "@/types/interviewReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, AlertTriangle, Loader2, PlusCircle, History, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";

export default function InterviewHistoryPage() {
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchInterviewReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await account.get();
        if (!user?.$id) {
          throw new AppwriteException("User not authenticated.", 401, "user_unauthorized");
        }

        if (!APPWRITE_DATABASE_ID || !INTERVIEWS_COLLECTION_ID) {
          setError("Appwrite database/collection IDs are not configured for interviews.");
          setIsLoading(false);
          return;
        }

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          INTERVIEWS_COLLECTION_ID,
          [
            Query.equal("userId", user.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(50) // Adjust limit or implement pagination later
          ]
        );
        setReports(response.documents as InterviewReport[]);
      } catch (err: any) {
        console.error("Interview history auth/data fetch error:", err);
        if (err instanceof AppwriteException && 
            (err.code === 401 || 
             err.type === 'user_unauthorized' || 
             err.type === 'general_unauthorized_scope')) {
          toast({ title: "Session Expired", description: "Please log in to view interview history.", variant: "default" });
          router.push('/login');
        } else {
            let errorMessage = "Could not fetch your saved interview reports.";
            if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            toast({
              title: "Error Fetching Reports",
              description: errorMessage.substring(0,150),
              variant: "destructive",
            });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviewReports();
  }, [router, toast]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-semibold flex items-center">
            <History className="mr-3 h-8 w-8 text-primary" /> Your Interview Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Review feedback from your past mock interviews.
          </p>
        </div>
        <Button asChild>
          <Link href="/interviews">
            <PlusCircle className="mr-2 h-4 w-4" /> Start New Interview
          </Link>
        </Button>
      </div>

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Loading Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your interview reports...</p>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <Card className="text-center py-12">
          <CardHeader>
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="font-headline text-2xl">No Interview Reports Saved</CardTitle>
            <CardDescription>
              You haven't completed any mock interviews yet. Start one to get feedback!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/interviews">Take a Mock Interview</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && reports.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.$id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-xl line-clamp-2" title={`Interview for: ${report.jobDescription}`}>
                  Interview: {report.jobDescription.substring(0, 50)}{report.jobDescription.length > 50 ? '...' : ''}
                </CardTitle>
                <CardDescription>
                  Taken {formatDistanceToNow(new Date(report.$createdAt), { addSuffix: true })}
                </CardDescription>
                 <CardDescription>
                  Score: {report.overallScore}/100
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  Summary: {report.overallSummary || "No summary provided."}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/interviews/report/${report.$id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Full Report
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
