
"use client";

import { Greeting } from "@/components/dashboard/Greeting";
import { NavigationButtons } from "@/components/dashboard/NavigationButtons";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookCopy, FileText, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { account, databases, Query, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID, INTERVIEWS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Lecture } from "@/types/lecture";
import type { InterviewReport } from "@/types/interviewReport";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { ADMIN_NAV_ITEMS } from "@/lib/constants";

interface DashboardActivityItem {
  id: string;
  title: string;
  timestamp: string;
  href: string;
}

export default function DashboardPage() {
  const [recentLectures, setRecentLectures] = useState<DashboardActivityItem[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);
  const [recentInterviewReports, setRecentInterviewReports] = useState<DashboardActivityItem[]>([]);
  const [isLoadingInterviewReports, setIsLoadingInterviewReports] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingLectures(true);
      setIsLoadingInterviewReports(true);
      setIsAdmin(false); 
      
      try {
        const user = await account.get();
        if (!user?.$id) {
          router.push("/login");
          return;
        }

        setIsAdmin(user.labels && user.labels.includes('admin'));
        console.log('User object:', user, 'Is Admin:', isAdmin);
        setTokenBalance((user.prefs as any)?.token_balance ?? 0); // Assuming token_balance is in prefs
        // This will only run for non-admin users now
        const userId = user.$id;

        // Fetch Recent Lectures
        if (APPWRITE_DATABASE_ID && LECTURES_COLLECTION_ID) {
          try {
            const lecturesResponse = await databases.listDocuments(
              APPWRITE_DATABASE_ID,
              LECTURES_COLLECTION_ID,
              [
                Query.equal("userId", userId),
                Query.orderDesc("$createdAt"),
                Query.limit(3)
              ]
            );
            const lecturesData = lecturesResponse.documents.map(doc => {
              const lecture = doc as Lecture;
              return {
                id: lecture.$id,
                title: lecture.topic,
                timestamp: formatDistanceToNow(new Date(lecture.$createdAt), { addSuffix: true }),
                href: `/lectures/view/${lecture.$id}`
              };
            });
            setRecentLectures(lecturesData);
          } catch (lectureError) {
            console.error("Failed to fetch recent lectures:", lectureError);
            toast({ title: "Error Loading Lectures", description: "Could not load recent lectures.", variant: "destructive" });
            setRecentLectures([]);
          }
        } else {
          console.warn("Dashboard: Appwrite DB/Collection IDs not set for lectures.");
          setRecentLectures([]);
        }
        setIsLoadingLectures(false);

        // Fetch Recent Interview Reports
        if (APPWRITE_DATABASE_ID && INTERVIEWS_COLLECTION_ID) {
          try {
            const interviewsResponse = await databases.listDocuments(
              APPWRITE_DATABASE_ID,
              INTERVIEWS_COLLECTION_ID,
              [
                Query.equal("userId", userId),
                Query.orderDesc("$createdAt"),
                Query.limit(3)
              ]
            );
            const interviewsData = interviewsResponse.documents.map(doc => {
              const report = doc as InterviewReport;
              return {
                id: report.$id,
                title: `Interview: ${report.jobDescription.substring(0, 50)}${report.jobDescription.length > 50 ? '...' : ''}`,
                timestamp: formatDistanceToNow(new Date(report.$createdAt), { addSuffix: true }),
                href: `/interviews/report/${report.$id}` 
              };
            });
            setRecentInterviewReports(interviewsData);
          } catch (interviewError) {
            console.error("Failed to fetch recent interview reports:", interviewError);
            toast({ title: "Error Loading Interview Feedback", description: "Could not load recent interview feedback.", variant: "destructive" });
            setRecentInterviewReports([]);
          }
        } else {
          console.warn("Dashboard: Appwrite DB/Collection IDs not set for interviews.");
          setRecentInterviewReports([]);
        }
        setIsLoadingInterviewReports(false);

      } catch (error) {
        console.error("Dashboard auth/data fetch error:", error);
        if (error instanceof AppwriteException && 
            (error.code === 401 ||
             error.type === 'user_unauthorized' || 
             error.type === 'general_unauthorized_scope')) {
          toast({ title: "Session Expired", description: "Please log in again.", variant: "default" });
          router.push('/login');
        } else {
          // This part might not be reached if an admin is redirected earlier,
          // but kept for general error handling for non-admins.
          toast({ title: "Error Loading Dashboard", description: "Could not load dashboard data. Please try again later.", variant: "destructive" });
          setRecentLectures([]);
          setRecentInterviewReports([]);
        }
        setIsLoadingLectures(false);
        setIsLoadingInterviewReports(false);
        setIsAdmin(false); // Ensure isAdmin is false on error
      }
    };

    fetchDashboardData();
  }, [router, toast]);

  // The UI for admin panel section on this page is effectively removed because admins will be redirected.
  // If an admin is NOT redirected (e.g., error before redirect), they won't see the admin panel here.
  // The `isAdmin` state for UI purposes is largely superseded by the redirect.
  // We could remove the `isAdmin` state and related UI section entirely from this page
  // if we're confident the redirect will always occur for admins.
  // For now, leaving the UI structure as is, though it won't be shown to admins if redirect works.

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <Greeting />
      {tokenBalance !== null && (
        <div className="text-lg font-semibold text-primary">Tokens: {tokenBalance}</div>
      )}
      </div>
      <p className="text-muted-foreground">
        Explore AI-powered tools to enhance your learning and preparation.
      </p>
      
      <Separator />

      <div>
        <h2 className="font-headline text-2xl font-semibold mb-4">Get Started</h2>
        <NavigationButtons />
      </div>

      {/* This section will not be visible to admins if the redirect above works correctly. */}
      {isAdmin && (
        <>
          <Separator />
          <div>
            <h2 className="font-headline text-2xl font-semibold mb-4 flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-primary" /> Admin Panel (Access from Header/Sidebar)
            </h2>
             <p className="text-sm text-muted-foreground mb-4">
                As an admin, you can access the admin panel directly using the links in the header or sidebar.
                You have been redirected from the main user dashboard to the admin dashboard.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link href={item.href} key={item.label} legacyBehavior>
                  <a className="block hover:no-underline group">
                    <Card className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer h-full flex flex-col">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-headline text-lg font-medium text-primary">
                          {item.label}
                        </CardTitle>
                        <item.icon className="h-6 w-6 text-accent" />
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-xs text-muted-foreground">
                          Access the {item.label.toLowerCase()} section.
                        </p>
                      </CardContent>
                      <div className="p-4 pt-0 mt-auto">
                          <span className="text-sm font-medium text-primary group-hover:underline flex items-center">
                              Go to {item.label} <ArrowRight className="ml-1 h-4 w-4" />
                          </span>
                      </div>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivityCard
          title="Recent Lectures"
          icon={BookCopy}
          items={recentLectures}
          isLoading={isLoadingLectures}
          emptyMessage="No lectures generated yet."
          viewAllLink="/lectures/history"
          emptyActionLink="/lectures"
          emptyActionText="Create a Lecture"
        />

        <RecentActivityCard
          title="Interview Feedback"
          icon={FileText}
          items={recentInterviewReports}
          isLoading={isLoadingInterviewReports}
          emptyMessage="No interview feedback available yet."
          viewAllLink="/interviews/history" 
          emptyActionLink="/interviews"
          emptyActionText="Start an Interview"
        />
      </div>
    </div>
  );
}
