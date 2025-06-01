
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Edit3, Camera, Loader2, Save } from "lucide-react";
import { account, storage, ID, AppwriteException, PROFILE_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import type { Models } from "appwrite";

interface UserPrefs extends Models.Preferences {
  firstName?: string;
  lastName?: string;
  // Add new preference fields for billing/account status
  token_balance?: number;
  subscription_status?: string;
  voucher_code?: string;
  voucher_usage_count?: number;
  profileImageStorageId?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [user, setUser] = useState<Models.User<UserPrefs> | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  
  // State for billing/account status
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageUrlPreview, setProfileImageUrlPreview] = useState<string | null>(null);
  const [currentProfileImageStorageId, setCurrentProfileImageStorageId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await account.get<UserPrefs>();
        setUser(currentUser);
        setEmail(currentUser.email);
        
        const prefs = currentUser.prefs;
        setFirstName(prefs.firstName || "");
        setLastName(prefs.lastName || "");

        // Fetch billing/account status information from preferences
        setTokenBalance(prefs.token_balance ?? 0); // Default to 0 if not set
        setSubscriptionStatus(prefs.subscription_status ?? null);
        setVoucherCode(prefs.voucher_code ?? null);
        
        if (prefs.profileImageStorageId && PROFILE_IMAGES_BUCKET_ID) {
          setCurrentProfileImageStorageId(prefs.profileImageStorageId);
          const imageUrl = storage.getFilePreview(PROFILE_IMAGES_BUCKET_ID, prefs.profileImageStorageId);
          setProfileImageUrlPreview(imageUrl.href);
        } else {
          // Use a placeholder if no profile image or bucket ID is set
           setProfileImageUrlPreview(`https://placehold.co/128x128.png?text=${(prefs.firstName || currentUser.name || 'U').substring(0,1).toUpperCase()}`);
        }

      } catch (error) {
        toast({
          title: "Error Fetching Profile",
          description: "Could not load your profile data. Please try logging in again.",
          variant: "destructive",
        });
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [router, toast]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic validation (can be expanded)
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive"});
          return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
          toast({ title: "Invalid File Type", description: "Please select a PNG, JPG, or GIF image.", variant: "destructive"});
          return;
      }
      setProfileImageFile(file);
      setProfileImageUrlPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    if (!user) {
      toast({ title: "Error", description: "User data not loaded.", variant: "destructive" });
      setIsUpdating(false);
      return;
    }

    try {
      let newProfileImageStorageId = currentProfileImageStorageId;

      // 1. Handle Profile Image Upload/Deletion
      if (profileImageFile && PROFILE_IMAGES_BUCKET_ID) {
        // If there's an old image, delete it first
        if (currentProfileImageStorageId) {
          try {
            await storage.deleteFile(PROFILE_IMAGES_BUCKET_ID, currentProfileImageStorageId);
          } catch (deleteError) {
            // Log error but proceed, maybe the file was already deleted or permissions changed
            console.warn("Could not delete old profile image:", deleteError);
          }
        }
        // Upload new image
        const uploadedFile = await storage.createFile(PROFILE_IMAGES_BUCKET_ID, ID.unique(), profileImageFile);
        newProfileImageStorageId = uploadedFile.$id;
      }

      // 2. Update User Name (main `name` attribute)
      const newName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (newName && newName !== user.name) {
        await account.updateName(newName);
      } else if (!newName && user.name) {
        // If both first and last name are cleared, clear the main name
        await account.updateName(""); 
      }
      
      // 3. Update User Preferences
      const currentPrefs = user.prefs || {};
      const updatedPrefs: UserPrefs = {
        ...currentPrefs,
        firstName: firstName.trim(),
        // Ensure new billing fields are included when updating prefs,
        // even if not directly modified in this form yet.
        // This prevents them from being removed on a save.
        lastName: lastName.trim(),
      };
      if (newProfileImageStorageId) {
        updatedPrefs.profileImageStorageId = newProfileImageStorageId;
      } else if (updatedPrefs.hasOwnProperty('profileImageStorageId') && !newProfileImageStorageId) {
        // If image was removed and no new one uploaded, remove the ID from prefs
        delete updatedPrefs.profileImageStorageId;
      }

      await account.updatePrefs(updatedPrefs);

      // Refresh user data locally for immediate UI update (optional, as effect hook will re-run)
      setUser(prevUser => prevUser ? {
         ...prevUser, 
         name: newName, 
         prefs: updatedPrefs 
        } : null);
      if (newProfileImageStorageId && PROFILE_IMAGES_BUCKET_ID) {
          setCurrentProfileImageStorageId(newProfileImageStorageId);
          // If a new file was uploaded, update preview from Appwrite, not local blob
          setProfileImageUrlPreview(storage.getFilePreview(PROFILE_IMAGES_BUCKET_ID, newProfileImageStorageId).href);
      } else if (!newProfileImageStorageId) {
          // If image was removed
          setCurrentProfileImageStorageId(null);
          setProfileImageUrlPreview(`https://placehold.co/128x128.png?text=${(firstName || newName || 'U').substring(0,1).toUpperCase()}`);
      }
      setProfileImageFile(null); // Clear the selected file

      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });

    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof AppwriteException) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!email) {
      toast({ title: "Error", description: "Email address not found.", variant: "destructive" });
      return;
    }
    try {
      await account.createRecovery(email, `${window.location.origin}/(auth)/reset-password`); // Adjust success URL if needed
      toast({
        title: "Password Recovery Email Sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error) {
      toast({
        title: "Failed to Send Recovery Email",
        description: "Could not send password recovery email. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Profile...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect in useEffect, but as a fallback:
    return (
      <div className="space-y-6 text-center">
        <h1 className="font-headline text-3xl font-semibold">User not found.</h1>
        <p className="text-muted-foreground">Please log in to view your profile.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  const avatarFallbackName = firstName || user.name || email;


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
        <form onSubmit={handleUpdateProfile}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Personal Information</CardTitle>
            <CardDescription>View and update your personal details. Your email is managed by your login provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage 
                    src={profileImageUrlPreview || `https://placehold.co/128x128.png?text=${avatarFallbackName.substring(0,1).toUpperCase()}`} 
                    alt={user.name || "User"}
                    data-ai-hint="user avatar" />
                <AvatarFallback className="text-4xl">
                    {avatarFallbackName ? avatarFallbackName.substring(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity">
                  <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Avatar>
              <Input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUpdating}>
                <Camera className="mr-2 h-4 w-4" /> Change Photo
              </Button>
               {!PROFILE_IMAGES_BUCKET_ID && (
                <p className="text-xs text-destructive text-center">Profile image bucket is not configured. Image uploads will not work.</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your First Name" disabled={isUpdating} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Your Last Name" disabled={isUpdating} />
                </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} placeholder="your@email.com" disabled />
              <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
            </div>
          </CardContent>
          <CardFooter>
             <Button type="submit" className="w-full sm:w-auto" disabled={isUpdating || isLoading}>
              {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : <><Save className="mr-2 h-4 w-4" /> Update Profile</>}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* New Card for Billing/Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Account Status & Billing</CardTitle>
          <CardDescription>View your current token balance and subscription details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Token Balance:</Label>
            <span className="font-semibold text-lg">{tokenBalance !== null ? tokenBalance : 'Loading...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <Label>Subscription Status:</Label>
            <span className="font-semibold">{subscriptionStatus ? subscriptionStatus.replace(/_/g, ' ') : 'No active subscription'}</span>
          </div>
           {voucherCode && (
             <div className="flex justify-between items-center">
                <Label>Active Voucher:</Label>
                <span className="font-semibold">{voucherCode}</span>
             </div>
           )}
           {/* Add more details like subscription end date, voucher expiry date if available */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleChangePassword} className="w-full sm:w-auto" disabled={isUpdating}>
            <Shield className="mr-2 h-4 w-4" /> Change Password
          </Button>
          <p className="text-xs text-muted-foreground mt-2">An email will be sent to you with instructions to reset your password.</p>
        </CardContent>
      </Card>
    </div>
  );
}
