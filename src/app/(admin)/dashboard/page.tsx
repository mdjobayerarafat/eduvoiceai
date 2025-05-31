
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpenText, MessageSquareText, Ticket, ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account, databases, users as appwriteUsers, APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID, INTERVIEWS_COLLECTION_ID, VOUCHERS_COLLECTION_ID } from "@/lib/appwrite"; // Assuming VOUCHERS_COLLECTION_ID is exported
import type { AppwriteUser } from "@/types/appwriteUser";

interface AdminStats {
  totalUsers: number;
  activeLectures: number;
  interviewsTaken: number;
  vouchersIssued: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    activeLectures: 0,
    interviewsTaken: 0,
    vouchersIssued: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await account.get();
        if (!currentUser.labels || !currentUser.labels.includes("admin")) {
          router.push("/dashboard"); // Redirect non-admins
          return;
        }

        let usersCount = 0;
        let lecturesCount = 0;
        let interviewsCount = 0;
        let vouchersCount = 0;

        // Fetch total users
        try {
          const usersResponse = await appwriteUsers.list();
          usersCount = usersResponse.total;
        } catch (e) { console.error("Failed to fetch users count:", e); }
        
        // Fetch total lectures
        if (APPWRITE_DATABASE_ID && LECTURES_COLLECTION_ID) {
          try {
            const lecturesResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, LECTURES_COLLECTION_ID);
            lecturesCount = lecturesResponse.total;
          } catch (e) { console.error("Failed to fetch lectures count:", e); }
        }

        // Fetch total interviews
        if (APPWRITE_DATABASE_ID && INTERVIEWS_COLLECTION_ID) {
          try {
            const interviewsResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, INTERVIEWS_COLLECTION_ID);
            interviewsCount = interviewsResponse.total;
          } catch (e) { console.error("Failed to fetch interviews count:", e); }
        }
        
        // Fetch total vouchers
        if (APPWRITE_DATABASE_ID && VOUCHERS_COLLECTION_ID) {
            try {
                const vouchersResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, VOUCHERS_COLLECTION_ID);
                vouchersCount = vouchersResponse.total;
            } catch (e) { console.error("Failed to fetch vouchers count:", e); }
        }


        setAdminStats({
          totalUsers: usersCount,
          activeLectures: lecturesCount,
          interviewsTaken: interviewsCount,
          vouchersIssued: vouchersCount,
        });

      } catch (err) {
        console.error("Error fetching admin data or user for admin check:", err);
        // If error is due to not being logged in, Appwrite SDK usually throws specific errors
        // For simplicity, redirect to user dashboard or login if any critical error occurs
        setError("Failed to load admin dashboard data. You may not have admin privileges or there was a server issue.");
        // router.push("/dashboard"); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="space-y-8 p-4">
         <h1 className="font-headline text-3xl font-semibold flex items-center">
          <ShieldAlert className="mr-3 h-8 w-8 text-destructive" /> Admin Dashboard Error
        </h1>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/> Access Denied or Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">Go to User Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <ShieldAlert className="mr-3 h-8 w-8 text-primary" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of EduVoice AI platform activity and user statistics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered users on the platform.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lectures Generated</CardTitle>
            <BookOpenText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.activeLectures.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total lectures created by users.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews Taken</CardTitle>
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.interviewsTaken.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Mock interviews completed.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vouchers Issued</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.vouchersIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total discount vouchers created.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Recent Activity (Conceptual)</CardTitle>
          <CardDescription>
            This section would display a feed of recent important activities from a dedicated 'activity_log' collection in Appwrite. Backend implementation is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            - User 'john.doe@example.com' registered. (Timestamp from log)<br />
            - Lecture on 'Quantum Physics' generated. (Timestamp from log)<br />
            - Admin 'admin_user_id' issued a new voucher 'NEWVOUCH'. (Timestamp from log)
          </p>
          <p className="mt-4 text-xs text-destructive">
            Note: Real-time activity monitoring and data fetching need backend integration with Appwrite (e.g., using Functions and a dedicated database collection for activities).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
