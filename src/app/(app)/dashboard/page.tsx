
"use client";

import { Greeting } from "@/components/dashboard/Greeting";
import { NavigationButtons } from "@/components/dashboard/NavigationButtons";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookCopy, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { account, databases, Query, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Lecture } from "@/types/lecture";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface DashboardActivityItem {
  id: string;
  title: string;
  timestamp: string;
  href: string;
}

const interviewFeedbackData: DashboardActivityItem[] = [
  { id: "1", title: "Software Engineer Mock Interview", timestamp: "1 week ago", href: "/interviews/history" },
  { id: "2", title: "Product Manager Behavioral Interview", timestamp: "3 weeks ago", href: "/interviews/history" },
];

export default function DashboardPage() {
  const [recentLectures, setRecentLectures] = useState<DashboardActivityItem[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecentLectures = async () => {
      setIsLoadingLectures(true);
      try {
        const user = await account.get();
        if (!user?.$id) {
          // This case should ideally be caught by the error handling below if account.get() throws
          setRecentLectures([]);
          router.push("/login");
          return;
        }
        
        if (!APPWRITE_DATABASE_ID || !LECTURES_COLLECTION_ID) {
          console.warn("Dashboard: Appwrite DB/Collection IDs not set for lectures.");
          setRecentLectures([]);
          setIsLoadingLectures(false);
          return;
        }

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          LECTURES_COLLECTION_ID,
          [
            Query.equal("userId", user.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(3)
          ]
        );
        
        const lecturesData = response.documents.map(doc => {
          const lecture = doc as Lecture;
          return {
            id: lecture.$id,
            title: lecture.topic,
            timestamp: new Date(lecture.$createdAt).toLocaleDateString(),
            href: `/lectures/view/${lecture.$id}`
          };
        });
        setRecentLectures(lecturesData);

      } catch (error) {
        console.error("Dashboard auth/data fetch error:", error);
        if (error instanceof AppwriteException && 
            (error.code === 401 ||
             error.type === 'user_unauthorized' || 
             error.type === 'general_unauthorized_scope')) {
          toast({ title: "Session Expired", description: "Please log in again.", variant: "default" });
          router.push('/login');
        } else {
          toast({ title: "Error Loading Dashboard", description: "Could not load dashboard data. Please try again later.", variant: "destructive" });
          setRecentLectures([]);
        }
      } finally {
        setIsLoadingLectures(false);
      }
    };

    fetchRecentLectures();
  }, [router, toast]);

  return (
    <div className="space-y-6">
      <Greeting />
      <p className="text-muted-foreground">
        Explore AI-powered tools to enhance your learning and preparation.
      </p>
      
      <Separator />

      <div>
        <h2 className="font-headline text-2xl font-semibold mb-4">Get Started</h2>
        <NavigationButtons />
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline text-xl font-medium">Recent Lectures</CardTitle>
            <BookCopy className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingLectures ? (
              <div className="flex justify-center items-center h-[150px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentLectures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No lectures generated yet.</p>
            ) : (
              <ScrollArea className="h-[150px]">
                <div className="space-y-3">
                  {recentLectures.map((item) => (
                    <Link href={item.href} key={item.id} className="block p-2 -m-2 rounded-md hover:bg-muted">
                        <div className="font-medium truncate">{item.title}</div>
                        <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
            {recentLectures.length > 0 && !isLoadingLectures && (
              <Link href="/lectures/history" className="text-sm text-primary hover:underline mt-3 block text-right">
                View All Lectures
              </Link>
            )}
             {recentLectures.length === 0 && !isLoadingLectures && (
              <Link href="/lectures" className="text-sm text-primary hover:underline mt-3 block text-center">
                Create a Lecture
              </Link>
            )}
          </CardContent>
        </Card>

        <RecentActivityCard
          title="Interview Feedback"
          icon={FileText}
          items={interviewFeedbackData}
          emptyMessage="No interview feedback available."
          viewAllLink="/interviews/history"
        />
      </div>
    </div>
  );
}
