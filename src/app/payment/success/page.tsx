
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, BrainCircuit } from "lucide-react"; // Added BrainCircuit
import Link from "next/link";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccessPage() {
    const { toast } = useToast();

    useEffect(() => {
        toast({
            title: "Payment Processing Successful!",
            description: "Your payment was successful. We are updating your account. This may take a moment. Redirecting you to the dashboard shortly...",
            duration: 7000,
            className: "bg-green-100 border-green-300 text-green-700"
        });
        // Optionally redirect after a delay
        // setTimeout(() => {
        //   window.location.href = '/dashboard';
        // }, 5000);
    }, [toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
       <Link href="/" className="flex items-center space-x-2 mb-8 text-primary">
            <BrainCircuit className="h-8 w-8" />
            <span className="font-bold font-headline text-2xl">EduVoice AI</span>
        </Link>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="font-headline text-3xl text-green-600">Payment Successful!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your EduVoice AI Pro Plan is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm">
            Your account has been upgraded, and your new tokens have been added.
            You can now enjoy unlimited access to all AI features.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
