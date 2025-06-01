
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreHorizontal, Search, Filter, Download, ShieldCheck, Ban, TrendingUp, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { account, users, AppwriteException } from "@/lib/appwrite"; 
import type { AppwriteUser } from "@/types/appwriteUser";
import { formatDistanceToNow } from 'date-fns';

// Function to determine user status conceptually based on Appwrite data
const getConceptualUserStatus = (user: AppwriteUser): string => {
  if (!user.status) return "Unknown"; // Appwrite's user.status is boolean (enabled/disabled)
  if (!user.emailVerification) return "Pending Verification";
  return user.status ? "Active" : "Disabled";
};

export default function ManageUsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [userList, setUserList] = useState<AppwriteUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsersAndCheckAdmin = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await account.get();
        if (!currentUser.labels || !currentUser.labels.includes("admin")) {
          router.push("/dashboard"); // Redirect non-admins
          return;
        }

        // Critical Check: Ensure the 'users' service is available
        if (!users) {
          console.error("ManageUsersPage: Appwrite Users service is not available. Check console for 'CRITICAL' errors from appwrite.ts.");
          setError("Appwrite Users service could not be initialized. User list cannot be fetched. Please check the browser console for more details from 'src/lib/appwrite.ts'.");
          setIsLoading(false);
          return;
        }
        
        const response = await users.list(); 
        setUserList(response.users as AppwriteUser[]);

      } catch (err: any) {
        console.error("Error fetching users or admin check:", err);
         let specificError = "Failed to load user data. You may not have permissions or there was a server issue.";
        if (err instanceof AppwriteException) {
            specificError = `Appwrite Error: ${err.message}. Ensure your Appwrite user or API key has 'users.read' permissions.`;
        }
        setError(specificError);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsersAndCheckAdmin();
  }, [router]);

  const filteredUsers = userList.filter(user =>
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Conceptual actions - these would require Appwrite Functions or direct SDK calls with proper permissions
  const handleMakeAdmin = (userId: string) => alert(`Conceptual: Make user ${userId} admin. Requires Appwrite backend logic to update user labels.`);
  const handleBanUser = (userId: string) => alert(`Conceptual: Ban user ${userId}. Requires Appwrite backend logic to update user status or labels.`);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-4">Loading User Management...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="space-y-8 p-4">
         <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Users className="mr-3 h-8 w-8 text-destructive" /> Manage Users Error
        </h1>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/> Data Fetching Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
            <Button onClick={() => router.push('/admindashboard')} variant="outline" className="mt-4">Back to Admin Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


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
          <CardTitle className="font-headline text-xl">User List ({filteredUsers.length} / {userList.length})</CardTitle>
          <CardDescription>
            Browse and manage all registered users. Some actions are conceptual and require backend implementation.
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => alert("Filter functionality to be implemented.")}>
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => alert("User export functionality to be implemented.")}>
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
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.$id}>
                  <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.labels?.includes("admin") ? (
                      <Badge variant="default" className="bg-primary/80 text-primary-foreground">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        getConceptualUserStatus(user) === "Active" ? "default" :
                        getConceptualUserStatus(user) === "Needs Subscription" ? "outline" : // conceptual
                        getConceptualUserStatus(user) === "Banned" ? "destructive" : // conceptual
                        getConceptualUserStatus(user) === "Disabled" ? "destructive" :
                        "secondary"
                      }
                      className={getConceptualUserStatus(user) === "Active" ? "bg-green-500/20 text-green-700 border-green-500/30" : 
                                 getConceptualUserStatus(user) === "Needs Subscription" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" : ""}
                    >
                      {getConceptualUserStatus(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(user.$createdAt), { addSuffix: true })}</TableCell>
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
                        <DropdownMenuItem onClick={() => alert(`View activity for ${user.name}. Requires activity logging collection.`)}>
                          <TrendingUp className="mr-2 h-4 w-4" /> View Activity
                        </DropdownMenuItem>
                        {!user.labels?.includes("admin") && (
                        <DropdownMenuItem onClick={() => handleMakeAdmin(user.$id)}>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Make Admin
                        </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleBanUser(user.$id)}>
                          <Ban className="mr-2 h-4 w-4" /> Ban User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {userList.length > 0 ? "No users found matching your search." : "No users found in the system."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
           <p className="mt-4 text-xs text-destructive">
            Note: User data is fetched from Appwrite. Actions like 'Make Admin' or 'Ban User' are conceptual and require robust backend implementation (e.g., Appwrite Functions to manage user labels/status and audit logs).
            Fetching all users requires appropriate permissions on your Appwrite project for the client or use of a backend function.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
