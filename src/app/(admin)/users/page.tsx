
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreHorizontal, Search, Filter, Download, ShieldCheck, Ban, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Placeholder user data - in a real app, this would come from Appwrite
const placeholderUsers = [
  { id: "1", name: "Alice Wonderland", email: "alice@example.com", plan: "Free Tier", tokensUsed: 45000, lastActivity: "2 hours ago", status: "Active" },
  { id: "2", name: "Bob The Builder", email: "bob@example.com", plan: "Pro Plan", tokensUsed: 120000, lastActivity: "1 day ago", status: "Active" },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", plan: "Free Tier", tokensUsed: 59000, lastActivity: "5 hours ago", status: "Needs Subscription" },
  { id: "4", name: "Diana Prince", email: "diana@example.com", plan: "Free Tier", tokensUsed: 15000, lastActivity: "3 days ago", status: "Inactive" },
  { id: "5", name: "Edward Scissorhands", email: "edward@example.com", plan: "Banned", tokensUsed: 0, lastActivity: "1 week ago", status: "Banned" },
];

export default function ManageUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = placeholderUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" /> Manage Users
        </h1>
        <p className="text-muted-foreground mt-1">
          View, search, and manage user accounts on the EduVoice AI platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">User List</CardTitle>
          <CardDescription>
            Browse and manage all registered users. Full functionality requires backend integration.
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export Users
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Tokens Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.plan === "Pro Plan" ? "default" : "secondary"}>{user.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{user.tokensUsed.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "Active" ? "default" :
                        user.status === "Needs Subscription" ? "outline" :
                        user.status === "Banned" ? "destructive" : "secondary"
                      }
                      className={user.status === "Active" ? "bg-green-500/20 text-green-700 border-green-500/30" : 
                                 user.status === "Needs Subscription" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" : ""}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.lastActivity}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <TrendingUp className="mr-2 h-4 w-4" /> View Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Make Admin (Conceptual)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Ban className="mr-2 h-4 w-4" /> Ban User (Conceptual)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
           <p className="mt-4 text-xs text-destructive">
            Note: User data is placeholder. Actions like 'Make Admin' or 'Ban User' are conceptual and require robust backend implementation with Appwrite (e.g., managing user roles, status, and audit logs).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
