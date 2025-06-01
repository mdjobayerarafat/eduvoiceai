
"use client";

import { Greeting } from "@/components/dashboard/Greeting";
import { NavigationButtons } from "@/components/dashboard/NavigationButtons";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookCopy, FileText, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { account, databases, Query, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID, INTERVIEWS_COLLECTION_ID, USERS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Lecture } from "@/types/lecture";
import type { InterviewReport } from "@/types/interviewReport";
// Assuming a type for user profile document, e.g., UserProfileDocument
// If not defined elsewhere, you might need to define it or use `any` carefully.
// import type { UserProfileDocument } from '@/types/userProfile'; 
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
  const [userNameForGreeting, setUserNameForGreeting] = useState<string | null>(null);
  const [recentLectures, setRecentLectures] = useState<DashboardActivityItem[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);
  const [recentInterviewReports, setRecentInterviewReports] = useState<DashboardActivityItem[]>([]);
  const [isLoadingInterviewReports, setIsLoadingInterviewReports] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true); // For token balance loading

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingLectures(true);
      setIsLoadingInterviewReports(true);
      setIsLoadingUserProfile(true);
      setIsAdmin(false);
      
      try {
        const currentUser = await account.get(); // Fetches Models.User<Models.Preferences>
        if (!currentUser?.$id) {
          router.push("/login");
          return;
        }
        setUserNameForGreeting(currentUser.name || "User");

        const userIsAdmin = currentUser.labels && currentUser.labels.includes('admin');
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          // Admin user: skip fetching user-specific data for this dashboard
          setTokenBalance(null); // Admins might not have a token balance shown here
          setRecentLectures([]);
          setRecentInterviewReports([]);
          setIsLoadingUserProfile(false);
          setIsLoadingLectures(false);
          setIsLoadingInterviewReports(false);
          // Admins are typically redirected to /admindashboard by their own page logic
          // or by AppHeader links.
        } else {
          // Non-admin user: fetch their profile document for token balance, and activities
          const userId = currentUser.$id;

          // Fetch User Profile Document from USERS_COLLECTION_ID for token_balance
          if (APPWRITE_DATABASE_ID && USERS_COLLECTION_ID) {
            try {
              const userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId);
              // Assuming 'token_balance' is a direct attribute of the userProfileDoc
              setTokenBalance((userProfileDoc as any).token_balance ?? 0); 
            } catch (profileError) {
              console.error("Failed to fetch user profile for token balance:", profileError);
              if (profileError instanceof AppwriteException && profileError.code === 404) {
                toast({ title: "Profile Incomplete", description: "Your user profile data is not found. Please contact support or try re-registering if this is a new account.", variant: "destructive", duration: 7000 });
              } else {
                toast({ title: "Error Loading Profile", description: "Could not load your token balance.", variant: "destructive" });
              }
              setTokenBalance(0); // Fallback
            }
          } else {
            console.warn("Dashboard: Appwrite DB/Collection IDs not set for user profile.");
            toast({ title: "Configuration Error", description: "User profile collection not configured.", variant: "destructive" });
            setTokenBalance(0); // Fallback
          }
          setIsLoadingUserProfile(false);

          // Fetch Recent Lectures
          if (APPWRITE_DATABASE_ID && LECTURES_COLLECTION_ID) {
            try {
              const lecturesResponse = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                LECTURES_COLLECTION_ID,
                [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(3)]
              );
              const lecturesData = lecturesResponse.documents.map(doc => {
                const lecture = doc as Lecture;
                return {
                  id: lecture.$id, title: lecture.topic,
                  timestamp: formatDistanceToNow(new Date(lecture.$createdAt), { addSuffix: true }),
                  href: `/lectures/view/${lecture.$id}`
                };
              });
              setRecentLectures(lecturesData);
            } catch (lectureError) {
              console.error("Failed to fetch recent lectures:", lectureError);
              // Toast handled by component or specific error if needed
            }
          }
          setIsLoadingLectures(false);

          // Fetch Recent Interview Reports
          if (APPWRITE_DATABASE_ID && INTERVIEWS_COLLECTION_ID) {
            try {
              const interviewsResponse = await databases.listDocuments(
                APPWRITE_DATABASE_ID, INTERVIEWS_COLLECTION_ID,
                [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(3)]
              );
              const interviewsData = interviewsResponse.documents.map(doc => {
                const report = doc as InterviewReport;
                return {
                  id: report.$id, title: `Interview: ${report.jobDescription.substring(0, 50)}${report.jobDescription.length > 50 ? '...' : ''}`,
                  timestamp: formatDistanceToNow(new Date(report.$createdAt), { addSuffix: true }),
                  href: `/interviews/report/${report.$id}`
                };
              });
              setRecentInterviewReports(interviewsData);
            } catch (interviewError) {
              console.error("Failed to fetch recent interview reports:", interviewError);
            }
          }
          setIsLoadingInterviewReports(false);
        }
      } catch (error) {
        console.error("Dashboard auth/data fetch error:", error);
        if (error instanceof AppwriteException && 
            (error.code === 401 || error.type === 'user_unauthorized' || error.type === 'general_unauthorized_scope')) {
          toast({ title: "Session Expired", description: "Please log in again.", variant: "default" });
          router.push('/login');
        } else {
          toast({ title: "Error Loading Dashboard", description: "Could not load dashboard data. Please try again later.", variant: "destructive" });
        }
        setRecentLectures([]);
        setRecentInterviewReports([]);
        setIsLoadingUserProfile(false);
        setIsLoadingLectures(false);
        setIsLoadingInterviewReports(false);
        setIsAdmin(false);
        setTokenBalance(null);
        setUserNameForGreeting(null);
      }
    };

    fetchDashboardData();
  }, [router, toast]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Greeting name={userNameForGreeting} isLoading={isLoadingUserProfile && !isAdmin} />
        {!isAdmin && tokenBalance !== null && !isLoadingUserProfile && (
          <div className="text-lg font-semibold text-primary">Tokens: {tokenBalance.toLocaleString()}</div>
        )}
        {!isAdmin && isLoadingUserProfile && (
           <div className="text-lg font-semibold text-primary flex items-center">
             <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading Tokens...
           </div>
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

      {/* This section will not be visible to admins if they are redirected or if isAdmin is true */}
      {isAdmin && (
        <>
          <Separator />
          <div>
            <h2 className="font-headline text-2xl font-semibold mb-4 flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-primary" /> Admin Panel Access
            </h2>
             <p className="text-sm text-muted-foreground mb-4">
                As an admin, you can access the admin dashboard and user management tools via the links in the header or sidebar.
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

      {!isAdmin && (
        <>
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
        </>
      )}
    </div>
  );
}
