
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { account, databases, Query, APPWRITE_DATABASE_ID, QA_REPORTS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { QAReport } from "@/types/qaReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, AlertTriangle, Loader2, PlusCircle, PlayCircle, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";

export default function QAPrepHistoryPage() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await account.get();
        if (!user?.$id) {
          throw new AppwriteException("User not authenticated.", 401, "user_unauthorized");
        }

        if (!APPWRITE_DATABASE_ID || !QA_REPORTS_COLLECTION_ID) {
          setError("Appwrite database/collection IDs are not configured for Q&A reports.");
          setIsLoading(false);
          return;
        }

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          QA_REPORTS_COLLECTION_ID,
          [
            Query.equal("userId", user.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(50) 
          ]
        );
        setReports(response.documents as QAReport[]);
      } catch (err: any) {
        console.error("Q&A Prep history auth/data fetch error:", err);
        if (err instanceof AppwriteException && 
            (err.code === 401 || 
             err.type === 'user_unauthorized' || 
             err.type === 'general_unauthorized_scope')) {
          toast({ title: "Session Expired", description: "Please log in to view Q&A Prep history.", variant: "default" });
          router.push('/login');
        } else {
            let errorMessage = "Could not fetch your saved Q&A Prep reports.";
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

    fetchReports();
  }, [router, toast]);

  const getStatusText = (status: QAReport['status']) => {
    switch (status) {
      case 'generated': return 'Ready to Take';
      case 'in_progress': return 'In Progress';
      case 'in_progress_evaluation': return 'Evaluating...';
      case 'completed': return 'Completed';
      case 'error_generating': return 'Error Generating';
      case 'error_evaluating': return 'Error Evaluating';
      case 'aborted': return 'Aborted';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-semibold flex items-center">
            <History className="mr-3 h-8 w-8 text-primary" /> Your Q&A Prep Quizzes
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and take quizzes you've generated.
          </p>
        </div>
        <Button asChild>
          <Link href="/qa-prep">
            <PlusCircle className="mr-2 h-4 w-4" /> Generate New Quiz
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
          <p className="mt-4 text-muted-foreground">Loading your Q&A Prep reports...</p>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <Card className="text-center py-12">
          <CardHeader>
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="font-headline text-2xl">No Quizzes Generated Yet</CardTitle>
            <CardDescription>
              You haven't generated any Q&A Prep quizzes. Go ahead and create one!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/qa-prep">Generate a Quiz</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && reports.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.$id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-xl line-clamp-2" title={report.quizTitle}>
                  {report.quizTitle}
                </CardTitle>
                <CardDescription>
                  Source: {report.pdfFileName || "N/A"}
                </CardDescription>
                <CardDescription>
                  {report.numQuestionsGenerated} Questions | {report.durationMinutes} min
                </CardDescription>
                 <CardDescription>
                  Status: <span className={`font-semibold ${report.status === 'completed' ? 'text-green-600' : report.status === 'generated' ? 'text-blue-600' : 'text-yellow-600'}`}>
                    {getStatusText(report.status)}
                  </span>
                </CardDescription>
                 <CardDescription>
                  Generated: {formatDistanceToNow(new Date(report.$createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {report.status === 'completed' && report.overallScore !== null && report.overallScore !== undefined && (
                    <p className="text-sm font-medium">Score: {report.overallScore} / {report.maxScore || report.numQuestionsGenerated}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                {report.status === 'generated' && (
                  <Button variant="default" className="w-full" asChild>
                    <Link href={`/qa-prep/exam/${report.$id}`}>
                      <PlayCircle className="mr-2 h-4 w-4" /> Take Exam
                    </Link>
                  </Button>
                )}
                {report.status === 'completed' && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/qa-prep/exam/${report.$id}`}> {/* Placeholder: Should be a report view page later */}
                      <Eye className="mr-2 h-4 w-4" /> View Report
                    </Link>
                  </Button>
                )}
                 {(report.status === 'in_progress' || report.status === 'in_progress_evaluation') && (
                  <Button variant="secondary" className="w-full" asChild disabled>
                      Processing...
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

