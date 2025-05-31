
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Edit3 } from "lucide-react";

// Placeholder for actual user data and auth state
const useUser = () => {
  return {
    user: {
      displayName: "Demo User",
      email: "demo@example.com",
      photoURL: null, // or a placeholder image URL
    },
    isLoading: false,
  };
};

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Profile Update",
      description: "Profile update functionality is not yet implemented.",
    });
  };

   const handleChangePassword = () => {
    toast({
      title: "Change Password",
      description: "Change password functionality is not yet implemented.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-headline text-3xl font-semibold">Loading Profile...</h1>
      </div>
    );
  }

  if (!user) {
    return (
       <div className="space-y-6">
        <h1 className="font-headline text-3xl font-semibold">User not found.</h1>
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center space-x-4">
        <User className="h-10 w-10 text-primary" />
        <div>
            <h1 className="font-headline text-3xl font-semibold">Your Profile</h1>
            <p className="text-muted-foreground mt-1">
                Manage your account settings and personal information.
            </p>
        </div>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Personal Information</CardTitle>
          <CardDescription>View and update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.photoURL || "https://placehold.co/100x100.png"} alt={user.displayName || "User"} data-ai-hint="user avatar" />
              <AvatarFallback>{user.displayName ? user.displayName.substring(0, 2).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.displayName || "No name provided"}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" defaultValue={user.displayName || ""} placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={user.email || ""} placeholder="your@email.com" disabled />
              <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Edit3 className="mr-2 h-4 w-4" /> Update Profile (Simulated)
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleChangePassword} className="w-full sm:w-auto">
            <Shield className="mr-2 h-4 w-4" /> Change Password (Simulated)
          </Button>
           <p className="text-xs text-muted-foreground mt-2">You will be redirected to a secure page to change your password.</p>
        </CardContent>
      </Card>
    </div>
  );
}
