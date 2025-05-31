"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Placeholder for Google Icon
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.8 0-5.18-1.88-6.04-4.42H2.05v2.84C3.87 20.98 7.66 23 12 23z" />
    <path d="M5.96 14.25c-.21-.66-.33-1.35-.33-2.05s.12-1.39.33-2.05V7.31H2.05c-1.1 2.16-1.1 4.76 0 6.92l3.91-2.98z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.13-3.13C17.45 2.09 14.97 1 12 1 7.66 1 3.87 3.02 2.05 5.96l3.91 2.98C6.82 6.26 9.2 5.38 12 5.38z" />
  </svg>
);

export function OAuthButtons() {
  const handleGoogleLogin = () => {
    // Placeholder for Google OAuth logic
    console.log("Attempting Google login...");
    // Typically, you'd use Firebase or NextAuth here:
    // signIn('google');
  };

  return (
    <>
      <div className="relative my-4">
        <Separator />
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
        <GoogleIcon />
        Google
      </Button>
    </>
  );
}