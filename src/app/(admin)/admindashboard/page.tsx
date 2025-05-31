
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpenText, MessageSquareText, Ticket, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
// Placeholder data - in a real app, this would come from a backend API
const adminStats = {
  totalUsers: 125,
  activeLectures: 78,
  interviewsTaken: 210,
  vouchersIssued: 35,
};

export default function AdminDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = await account.get();
        if (!user.labels || !user.labels.includes("admin")) {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching user for admin check:", error);
        router.push("/dashboard"); // Redirect if there's an error fetching user or no user
      }
    };
    checkAdminStatus();
  }, [router]);
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
            <p className="text-xs text-muted-foreground">Discount vouchers created.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Recent Activity (Conceptual)</CardTitle>
          <CardDescription>
            This section would display a feed of recent important activities, e.g., new user registrations, high token usage alerts, etc. Backend implementation is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            - User 'john.doe@example.com' registered. (2 minutes ago)<br />
            - Lecture on 'Quantum Physics' generated. (15 minutes ago)<br />
            - Admin 'admin@example.com' issued a new voucher. (1 hour ago)
          </p>
          <p className="mt-4 text-xs text-destructive">
            Note: Data displayed here is for demonstration purposes only. Real-time activity monitoring and data fetching need backend integration with Appwrite (e.g., using Functions and database queries).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
