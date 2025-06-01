
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import { account } from '@/lib/appwrite'; // Import Appwrite client
import { AppwriteException } from 'appwrite';

const SuccessPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);

  const handleActivateProPlan = async () => {
    setIsActivating(true);
    setActivationMessage(null);
    setActivationError(null);

    try {
      const currentUser = await account.get();
      if (!currentUser?.$id) {
        throw new Error("User not found. Please ensure you are logged in.");
      }
      const userId = currentUser.$id;

      const response = await fetch('/api/user/activate-pro-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to activate Pro plan.");
      }

      setActivationMessage(result.message || "Pro plan activated successfully! Your account has been updated.");
      toast({
        title: "Pro Plan Activated!",
        description: result.message || "Your subscription benefits are now active.",
        className: "bg-green-100 border-green-300 text-green-800",
      });
      // Optionally redirect or update UI further
      // router.push('/settings/subscription');

    } catch (error: any) {
      console.error("Error activating Pro plan:", error);
      let errorMessage = "An unexpected error occurred during activation.";
      if (error instanceof AppwriteException) {
        errorMessage = `Appwrite error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setActivationError(errorMessage);
      toast({
        title: "Activation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="font-headline text-3xl font-bold text-primary">Payment Successful!</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Thank you for your payment. Your transaction was successful.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            To complete your Pro plan activation and update your account benefits, please click the button below.
          </p>
          
          {!activationMessage && !activationError && (
            <Button 
              onClick={handleActivateProPlan} 
              disabled={isActivating}
              size="lg"
              className="w-full"
            >
              {isActivating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
              ) : (
                "Activate My Pro Plan"
              )}
            </Button>
          )}

          {activationMessage && (
            <div className="p-3 rounded-md bg-green-500/10 border border-green-500/30 text-green-700 text-sm">
              <CheckCircle className="inline h-5 w-5 mr-2" /> {activationMessage}
            </div>
          )}
          {activationError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <Info className="inline h-5 w-5 mr-2" /> Error: {activationError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" variant="secondary">
              <Link href="/settings/subscription">
                View Subscription Status
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Note: If you encounter any issues, your payment may also be confirmed and activated via a background process (webhook) within a few minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessPage;
