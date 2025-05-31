
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { account, databases, APPWRITE_DATABASE_ID, INTERVIEWS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { InterviewReport } from "@/types/interviewReport";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, FileText, ArrowLeft, ThumbsUp, ThumbsDown, Sparkles, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import type { FinalInterviewFeedbackOutput } from "@/ai/flows/final-interview-feedback-flow"; // Assuming this type is what's stored

type DetailedFeedbackItem = FinalInterviewFeedbackOutput['detailedFeedback'][0];

export default function ViewInterviewReportPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [detailedFeedback, setDetailedFeedback] = useState<DetailedFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setError("Report ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await account.get(); // Check authentication

        const document = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          INTERVIEWS_COLLECTION_ID,
          reportId
        );
        const fetchedReport = document as InterviewReport;
        setReport(fetchedReport);

        if (fetchedReport.detailedFeedback) {
          try {
            const parsedFeedback = JSON.parse(fetchedReport.detailedFeedback) as DetailedFeedbackItem[];
            setDetailedFeedback(parsedFeedback);
          } catch (parseError) {
            console.error("Failed to parse detailedFeedback JSON:", parseError);
            setError("Error parsing detailed feedback from the report.");
            setDetailedFeedback([]); // Set to empty if parsing fails
          }
        }

      } catch (err: any) {
        console.error("Error fetching interview report:", err);
        if (err instanceof AppwriteException) {
          if (err.code === 401 || err.type === 'user_unauthorized' || err.type === 'general_unauthorized_scope') {
            toast({ title: "Authentication Error", description: "Please log in to view this report.", variant: "destructive" });
            router.push('/login');
            return;
          } else if (err.code === 404 || err.type === 'document_not_found') {
            setError("Interview report not found. It may have been deleted or you may not have permission to view it.");
          } else if (err.code === 403 || err.type === 'user_forbidden' ) {
             setError("You do not have permission to view this report.");
          } else {
            setError(`Could not load report: ${err.message}`);
          }
        } else {
          setError("An unexpected error occurred while fetching the report.");
        }
        toast({ title: "Error Loading Report", description: error || "Failed to load interview report.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [reportId, router, toast, error]); // Added error to dependency array

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading interview report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="font-headline text-3xl font-semibold flex items-center">
            <FileText className="mr-3 h-8 w-8 text-destructive" /> Error Loading Report
          </h1>
          <Button variant="outline" asChild>
            <Link href="/dashboard"> {/* Consider linking to /interviews/history later */}
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
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

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="font-headline text-3xl font-semibold">Report Not Found</h1>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
        </div>
        <Card className="text-center py-12">
          <CardHeader>
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle>Oops! Report not available.</CardTitle>
            <CardDescription>We couldn't find the interview report you were looking for.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-semibold line-clamp-2">
            Interview Report
          </h1>
          <p className="text-sm text-muted-foreground">
            For job: {report.jobDescription.substring(0,100)}{report.jobDescription.length > 100 ? '...' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Created: {formatDistanceToNow(new Date(report.$createdAt), { addSuffix: true })}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard"> {/* Later: /interviews/history */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="flex-grow flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="font-headline text-2xl flex items-center">
                    <Award className="mr-2 text-primary h-7 w-7" /> Overall Performance
                </CardTitle>
            </div>
            {report.closingRemark && <CardDescription className="italic mt-1">{report.closingRemark}</CardDescription>}
          </CardHeader>
          <CardContent className="flex-grow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Card className="p-4 text-center col-span-1 md:col-span-1 bg-muted/30">
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className="text-5xl font-bold text-primary">{report.overallScore}<span className="text-2xl text-muted-foreground">/100</span></p>
                </Card>
                <Card className="p-4 col-span-1 md:col-span-2 bg-muted/30">
                     <h3 className="font-headline text-lg font-semibold mb-2 flex items-center">
                        {report.overallScore >= 80 ? <ThumbsUp className="mr-2 text-green-500" /> : report.overallScore >=50 ? <Sparkles className="mr-2 text-yellow-500" /> : <ThumbsDown className="mr-2 text-red-500" />}
                        Summary
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{report.overallSummary}</p>
                </Card>
            </div>
            
            <Separator />

            <div>
                <h3 className="font-headline text-xl font-semibold mb-3">Detailed Question Feedback</h3>
                <ScrollArea className="h-[400px] pr-3"> {/* Adjust height as needed */}
                    <div className="space-y-4">
                    {detailedFeedback && detailedFeedback.length > 0 ? (
                        detailedFeedback.map((item, index) => (
                            <Card key={index} className="p-4 border shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-primary">Question {index + 1}:</p>
                                        <p className="text-sm text-muted-foreground mb-1 whitespace-pre-wrap">{item.question}</p>
                                    </div>
                                    {item.questionScore !== undefined && (
                                        <div className="text-right ml-4">
                                            <p className="text-xs text-muted-foreground">Score</p>
                                            <p className="text-lg font-semibold text-primary">{item.questionScore}/10</p>
                                        </div>
                                    )}
                                </div>
                                
                                <p className="font-semibold mt-2">Your Answer:</p>
                                <p className="text-sm mb-2 p-2 bg-primary/5 rounded whitespace-pre-wrap">{item.answer || <span className="italic text-muted-foreground">No answer recorded.</span>}</p>
                                
                                <p className="font-semibold mt-2 flex items-center"><Sparkles className="mr-1 h-4 w-4 text-accent" />Specific Feedback:</p>
                                <p className="text-sm p-2 bg-secondary/30 rounded whitespace-pre-wrap">{item.specificFeedback}</p>
                            </Card>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No detailed feedback available for individual questions.</p>
                    )}
                    </div>
                </ScrollArea>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}

    