
"use client";

import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AppwriteException } from "appwrite";

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.8 0-5.18-1.88-6.04-4.42H2.05v2.84C3.87 20.98 7.66 23 12 23z" />
    <path d="M5.96 14.25c-.21-.66-.33-1.35-.33-2.05s.12-1.39.33-2.05V7.31H2.05c-1.1 2.16-1.1 4.76 0 6.92l3.91-2.98z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.13-3.13C17.45 2.09 14.97 1 12 1 7.66 1 3.87 3.02 2.05 5.96l3.91 2.98C6.82 6.26 9.2 5.38 12 5.38z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.655 15.074c-.465 1.499-1.449 2.929-2.825 2.929-1.264 0-1.94-.797-3.316-.797s-2.081.797-3.316.797c-1.375 0-2.331-1.387-2.825-2.929-.548-1.748.069-4.531 1.307-6.078.672-.865 1.439-1.45 2.263-1.45.912 0 1.481.633 2.562.633s1.621-.633 2.591-.633c.824 0 1.59.584 2.263 1.45.974 1.254 1.884 3.839 1.306 6.078zm-4.717-9.18c.084-.992.797-1.826 1.539-2.264-.548-.939-1.797-1.293-2.479-1.321-.992.028-1.911.527-2.422.527s-1.401-.499-2.39-.527c-1.207 0-2.292.605-2.882 1.539.939.557 1.539 1.65 1.481 2.74-.056.992-.741 1.797-1.481 2.208.689.997 1.997 1.375 2.622 1.347.964-.028 1.596-.584 2.305-.584s1.319.556 2.305.584c.624.028 1.933-.35 2.622-1.347-.741-.411-1.425-1.216-1.452-2.208z"/>
  </svg>
);

export function OAuthButtons() {
  const { toast } = useToast();

  // Define these based on your Appwrite console setup
  // These are usually the current page or a dedicated callback handler page
  const successUrl = `${window.location.origin}/dashboard`; 
  const failureUrl = `${window.location.origin}/login?error=oauth_failed`;

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      // This will redirect the user
      account.createOAuth2Session(
        provider,
        successUrl, // Appwrite will redirect here on success
        failureUrl, // Appwrite will redirect here on failure
        ['profile', 'email'] // Scopes (optional, adjust as needed)
      );
      // No direct navigation or toast here as the page will redirect.
      // Session handling will occur on the `successUrl` page.
    } catch (error: any) {
      let description = "An unexpected error occurred during OAuth.";
      if (error instanceof AppwriteException) {
        description = error.message;
      }
      toast({
        title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Login Failed`,
        description: description,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <Button variant="outline" className="w-full" onClick={() => handleOAuthLogin('google')}>
          <GoogleIcon />
          Google
        </Button>
        <Button variant="outline" className="w-full bg-black text-white hover:bg-gray-800 hover:text-white" onClick={() => handleOAuthLogin('apple')}>
          <AppleIcon />
          Sign in with Apple
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Note: For OAuth, ensure success/failure URLs are set in your Appwrite console.
        You will be redirected.
      </p>
    </>
  );
}
