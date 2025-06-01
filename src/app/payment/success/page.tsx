
// This file is no longer needed as we are reverting to a simulated subscription model
// and will not be redirecting to Stripe.
// You can safely delete this file.
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccessPage() {
    const { toast } = useToast();

    useEffect(() => {
        // This toast is a fallback in case the webhook processing is delayed
        // or if the user arrives here before the webhook has fully updated their status.
        toast({
            title: "Payment Processing",
            description: "Your payment was successful! We are updating your account. This may take a moment. Please check your dashboard or refresh shortly.",
            duration: 10000,
        });
    }, [toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
       <Link href="/" className="flex items-center space-x-2 mb-8 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit"><path d="M12 5a3 3 0 1 0-5.997.125"/><path d="M12 5a3 3 0 1 0 5.997.125"/><path d="M12 5a3 3 0 1 0-5.997.125"/><path d="M12 5a3 3 0 1 0 5.997.125"/><path d="M15 5.125A3 3 0 1 0 12 8a3 3 0 0 0 3-2.875"/><path d="M9 5.125A3 3 0 1 1 12 8a3 3 0 0 1-3-2.875"/><path d="M9 5.125A3 3 0 1 0 12 8a3 3 0 0 0-3-2.875"/><path d="M15 5.125A3 3 0 1 1 12 8a3 3 0 0 1 3-2.875"/><path d="M6.003 5.125A3 3 0 1 0 9 8a3 3 0 0 0-2.997-2.875"/><path d="M17.997 5.125A3 3 0 1 1 15 8a3 3 0 0 1 2.997-2.875"/><path d="M6.003 5.125A3 3 0 1 0 9 8a3 3 0 0 0-2.997-2.875"/><path d="M17.997 5.125A3 3 0 1 1 15 8a3 3 0 0 1 2.997-2.875"/><path d="M12 12a3 3 0 1 0-5.997.125"/><path d="M12 12a3 3 0 1 0 5.997.125"/><path d="M12 12a3 3 0 1 0-5.997.125"/><path d="M12 12a3 3 0 1 0 5.997.125"/><path d="M15 12.125A3 3 0 1 0 12 15a3 3 0 0 0 3-2.875"/><path d="M9 12.125A3 3 0 1 1 12 15a3 3 0 0 1-3-2.875"/><path d="M9 12.125A3 3 0 1 0 12 15a3 3 0 0 0-3-2.875"/><path d="M15 12.125A3 3 0 1 1 12 15a3 3 0 0 1 3-2.875"/><path d="M6.003 12.125A3 3 0 1 0 9 15a3 3 0 0 0-2.997-2.875"/><path d="M17.997 12.125A3 3 0 1 1 15 15a3 3 0 0 1 2.997-2.875"/><path d="M6.003 12.125A3 3 0 1 0 9 15a3 3 0 0 0-2.997-2.875"/><path d="M17.997 12.125A3 3 0 1 1 15 15a3 3 0 0 1 2.997-2.875"/><path d="M12 19a3 3 0 1 0-5.997.125"/><path d="M12 19a3 3 0 1 0 5.997.125"/><path d="M12 19a3 3 0 1 0-5.997.125"/><path d="M12 19a3 3 0 1 0 5.997.125"/><path d="M15 19.125A3 3 0 1 0 12 22a3 3 0 0 0 3-2.875"/><path d="M9 19.125A3 3 0 1 1 12 22a3 3 0 0 1-3-2.875"/><path d="M9 19.125A3 3 0 1 0 12 22a3 3 0 0 0-3-2.875"/><path d="M15 19.125A3 3 0 1 1 12 22a3 3 0 0 1 3-2.875"/><path d="M6.003 19.125A3 3 0 1 0 9 22a3 3 0 0 0-2.997-2.875"/><path d="M17.997 19.125A3 3 0 1 1 15 22a3 3 0 0 1 2.997-2.875"/><path d="M6.003 19.125A3 3 0 1 0 9 22a3 3 0 0 0-2.997-2.875"/><path d="M17.997 19.125A3 3 0 1 1 15 22a3 3 0 0 1 2.997-2.875"/><path d="M2.921 8.5H1.054"/><path d="M22.946 8.5h-1.867"/><path d="M2.921 15.5H1.054"/><path d="M22.946 15.5h-1.867"/><path d="M12.5 2.896V1.029"/><path d="M12.5 22.971V21.103"/><path d="M19.213 4.787l1.32-1.32"/><path d="M4.787 4.787l-1.32-1.32"/><path d="M19.213 19.213l1.32 1.32"/><path d="M4.787 19.213l-1.32 1.32"/></svg>
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
