
"use client";

import { Greeting } from "@/components/dashboard/Greeting";
import { NavigationButtons } from "@/components/dashboard/NavigationButtons";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Separator } from "@/components/ui/separator";
import { BookCopy, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { account, databases, Query, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID } from "@/lib/appwrite";
import type { Lecture } from "@/types/lecture"; // Assuming you have this type
import Link from "next/link";

interface DashboardActivityItem {
  id: string;
  title: string;
  timestamp: string;
  href: string;
}

// Placeholder data for interview feedback (can be updated later)
const interviewFeedbackData: DashboardActivityItem[] = [
  { id: "1", title: "Software Engineer Mock Interview", timestamp: "1 week ago", href: "/interviews/history" }, // Update href later
  { id: "2", title: "Product Manager Behavioral Interview", timestamp: "3 weeks ago", href: "/interviews/history" }, // Update href later
];

export default function DashboardPage() {
  const [recentLectures, setRecentLectures] = useState<DashboardActivityItem[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);

  useEffect(() => {
    const fetchRecentLectures = async () => {
      setIsLoadingLectures(true);
      try {
        const user = await account.get();
        if (!user?.$id) {
          // Not logged in, or error fetching user
          setRecentLectures([]);
          setIsLoadingLectures(false);
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
            Query.limit(3) // Fetch 3 most recent
          ]
        );
        
        const lecturesData = response.documents.map(doc => {
          const lecture = doc as Lecture; // Cast to your Lecture type
          return {
            id: lecture.$id,
            title: lecture.topic,
            timestamp: new Date(lecture.$createdAt).toLocaleDateString(), // Or use date-fns for better formatting
            href: `/lectures/view/${lecture.$id}` // Link to a future detailed view page
          };
        });
        setRecentLectures(lecturesData);

      } catch (error) {
        console.error("Error fetching recent lectures for dashboard:", error);
        setRecentLectures([]); // Set to empty on error
      } finally {
        setIsLoadingLectures(false);
      }
    };

    fetchRecentLectures();
  }, []);

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
              <ScrollArea className="h-[150px]"> {/* Adjusted height */}
                <div className="space-y-3"> {/* Adjusted spacing */}
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

        {/* Interview Feedback card remains with placeholder data for now */}
        <RecentActivityCard
          title="Interview Feedback"
          icon={FileText}
          items={interviewFeedbackData}
          emptyMessage="No interview feedback available."
          viewAllLink="/interviews/history" // Placeholder link, to be updated when interview history is implemented
        />
      </div>
    </div>
  );
}
