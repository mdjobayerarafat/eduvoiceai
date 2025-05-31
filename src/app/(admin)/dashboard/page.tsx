
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ticket, BarChart3, Construction } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview and management tools for EduVoice AI. (Conceptual)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline text-xl">Registered Users</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              (Placeholder)
            </p>
            <Link href="/admin/users" className="text-sm text-accent hover:underline mt-2 block">
              Manage Users &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline text-xl">Vouchers Issued</CardTitle>
            <Ticket className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">56</div>
            <p className="text-xs text-muted-foreground">
              (Placeholder)
            </p>
             <Link href="/admin/vouchers" className="text-sm text-accent hover:underline mt-2 block">
              Manage Vouchers &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline text-xl">User Activity</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Placeholder for activity metrics)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Monitoring lecture generation, interviews taken, etc. would require backend implementation.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Construction className="mr-2 h-6 w-6 text-accent" />
            More Admin Features Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This admin panel is a conceptual placeholder. Full functionality for managing users, monitoring detailed activities, and creating/managing vouchers requires backend development and database integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
