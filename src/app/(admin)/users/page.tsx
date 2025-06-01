
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Users, MoreHorizontal, Search, Filter, Download, ShieldCheck, Ban, TrendingUp, Loader2, AlertTriangle, Edit, Coins, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { account, AppwriteException, databases, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from "@/lib/appwrite"; 
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { Models } from 'appwrite';
import { useToast } from "@/hooks/use-toast";

interface CustomUserDocument extends Models.Document {
  username: string; 
  email: string;
  role?: "admin" | "user"; 
  subscription_status?: "trial" | "active" | "cancelled" | "past_due";
  token_balance?: number;
  subscription_end_date?: string; 
}

const subscriptionStatuses: CustomUserDocument['subscription_status'][] = ["trial", "active", "cancelled", "past_due"];

const getConceptualUserStatus = (user: CustomUserDocument): string => {
  if (user.subscription_status === "active") return "Active";
  if (user.subscription_status === "trial") return "Trial";
  if (user.subscription_status === "cancelled") return "Cancelled";
  if (user.subscription_status === "past_due") return "Past Due";
  return "Unknown"; 
};

export default function ManageUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userList, setUserList] = useState<CustomUserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStatusForUser, setEditingStatusForUser] = useState<string | null>(null);


  useEffect(() => {
    const fetchUsersAndCheckAdmin = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await account.get(); 
        if (!currentUser.labels || !currentUser.labels.includes("admin")) {
          router.push("/dashboard"); 
          return;
        }

        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch users: ${response.statusText}`);
        }
        const data = await response.json();
        setUserList(data as CustomUserDocument[]);

      } catch (err: any) {
        console.error("Error fetching users or admin check:", err);
        let specificError = "Failed to load user data. You may not have permissions or there was a server issue.";
        if (err instanceof AppwriteException) {
            specificError = `Appwrite Error (Admin Check): ${err.message}.`;
        } else if (err.message) {
            specificError = err.message;
        }
        setError(specificError);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsersAndCheckAdmin();
  }, [router]);

  const filteredUsers = userList.filter(user =>
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const handleMakeAdmin = (userId: string) => alert(`Conceptual: Make user ${userId} admin. Requires backend logic to update 'role' attribute in the custom user collection or Auth user labels.`);
  const handleBanUser = (userId: string) => alert(`Conceptual: Ban user ${userId}. Requires backend logic to update 'subscription_status' or a dedicated 'status' field in the custom user collection.`);

  const handleUpdateSubscriptionStatus = async (userId: string, newStatus: CustomUserDocument['subscription_status']) => {
    if (!newStatus) return;
    setEditingStatusForUser(userId); // Indicate loading for this specific user action

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription_status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to update status for user ${userId}`);
      }

      // Update local state
      setUserList(prevList => 
        prevList.map(user => 
          user.$id === userId ? { ...user, subscription_status: newStatus } : user
        )
      );

      toast({
        title: "Status Updated",
        description: `Subscription status for user ${result.data.username || result.data.email} updated to ${newStatus}.`,
      });
    } catch (err: any) {
      console.error("Error updating subscription status:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Could not update user subscription status.",
        variant: "destructive",
      });
    } finally {
      setEditingStatusForUser(null);
    }
  };


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
          View, search, and manage user accounts from the custom database collection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">User List ({filteredUsers.length} / {userList.length})</CardTitle>
          <CardDescription>
            Browse and manage all registered users. Admin check uses Appwrite Auth labels.
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by username or email..."
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
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><Coins className="inline h-4 w-4 mr-1"/>Tokens</TableHead>
                <TableHead><CalendarDays className="inline h-4 w-4 mr-1"/>Sub. End</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.$id}>
                  <TableCell className="font-medium">{user.username || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge variant="default" className="bg-primary/80 text-primary-foreground">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        getConceptualUserStatus(user) === "Active" ? "default" :
                        getConceptualUserStatus(user) === "Trial" ? "outline" :
                        (getConceptualUserStatus(user) === "Cancelled" || getConceptualUserStatus(user) === "Past Due") ? "destructive" :
                        "secondary"
                      }
                      className={getConceptualUserStatus(user) === "Active" ? "bg-green-500/20 text-green-700 border-green-500/30" : 
                                 getConceptualUserStatus(user) === "Trial" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" : ""}
                    >
                      {getConceptualUserStatus(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.token_balance?.toLocaleString() ?? 'N/A'}</TableCell>
                  <TableCell>{user.subscription_end_date ? format(parseISO(user.subscription_end_date), 'PP') : 'N/A'}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(user.$createdAt), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={editingStatusForUser === user.$id}>
                          {editingStatusForUser === user.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => alert(`View activity for ${user.username}. Requires activity logging collection.`)}>
                          <TrendingUp className="mr-2 h-4 w-4" /> View Activity
                        </DropdownMenuItem>
                        
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Change Sub. Status</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup 
                              value={user.subscription_status}
                              onValueChange={(newStatus) => handleUpdateSubscriptionStatus(user.$id, newStatus as CustomUserDocument['subscription_status'])}
                            >
                              {subscriptionStatuses.map((status) => (
                                <DropdownMenuRadioItem key={status} value={status || ""}>
                                  {status ? status.charAt(0).toUpperCase() + status.slice(1) : "None"}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {user.role !== "admin" && (
                        <DropdownMenuItem onClick={() => handleMakeAdmin(user.$id)}>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Make Admin
                        </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleBanUser(user.$id)}>
                          <Ban className="mr-2 h-4 w-4" /> Ban User (Conceptual)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {userList.length > 0 ? "No users found matching your search." : "No users found in the system."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
           <p className="mt-4 text-xs text-destructive">
            Note: User data is fetched from your custom Appwrite collection. 'Make Admin' or 'Ban User' are conceptual. Updating Subscription Status now works via API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    