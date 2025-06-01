"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, ExternalLink, Info, Zap, Coins, Loader2 } from "lucide-react";
import { account } from "@/lib/appwrite";
import type { Models } from "appwrite";

// Define interfaces for user preferences and user data from Appwrite
interface AppwriteUserPrefs extends Models.Preferences {
  token_balance?: number;
}

interface AppwriteUser extends Models.User<AppwriteUserPrefs> {
  // subscription_status and subscription_end_date are in prefs
  // subscription_status?: string;
  // Add other custom attributes here if needed
}

const FREE_TOKEN_ALLOWANCE = 60000;

export default function SubscriptionPage() {
  const { toast } = useToast();
  const router = useRouter();

  // State for real user data
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isProSubscribed, setIsProSubscribed] = useState<boolean>(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const currentUser = await account.get<AppwriteUserPrefs>();
      setUser(currentUser as AppwriteUser); // Cast if needed
      setTokenBalance(currentUser.prefs?.token_balance ?? 0);
      setIsProSubscribed(currentUser.prefs?.subscription_status === 'active'); // Check subscription status from prefs
      setSubscriptionEndDate(currentUser.prefs?.subscription_end_date ?? null); // Set end date from prefs

    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError("Failed to load subscription data. Please try again.");
      toast({
          title: "Error",
          description: "Failed to load subscription data.",
          variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchUserData();
  }, [toast]);


  const handleSubscribe = () => {
    // In a real app, this would initiate a Stripe checkout session via your backend
    toast({
      title: "Stripe Integration Needed",
      description: "This would typically redirect you to Stripe to complete your subscription. Backend integration with Stripe is required.",
      duration: 5000,
    });
  };

  const handleManageSubscription = () => {
    // In a real app, this would redirect to a Stripe customer portal via your backend
     toast({
      title: "Stripe Integration Needed",
      description: "This would typically redirect you to a Stripe customer portal to manage your subscription. Backend integration is required.",
      duration: 5000,
    });
  };

  // Calculate tokens remaining based on the fetched tokenBalance
  const tokensRemaining = tokenBalance !== null ? tokenBalance : FREE_TOKEN_ALLOWANCE;
  // Calculate progress based on tokens used vs. allowance
  const tokensUsed = FREE_TOKEN_ALLOWANCE - tokensRemaining;
  const progress = FREE_TOKEN_ALLOWANCE > 0 ? (tokensUsed / FREE_TOKEN_ALLOWANCE) * 100 : 0;


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Subscription Info...</p>
      </div>
    );
  }

   if (error) {
    return (
      <div className="space-y-8 text-center text-destructive">
        <h1 className="font-headline text-3xl font-semibold">Error Loading Data</h1>
        <p>{error}</p>
         <Button onClick={fetchUserData}>Retry</Button>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <CreditCard className="mr-3 h-8 w-8 text-primary" /> Subscription & Usage
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your EduVoice AI plan and track your token usage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Coins className="mr-2 h-6 w-6 text-yellow-500" /> Your Token Usage
          </CardTitle>
          <CardDescription>
             Your current token balance for using AI features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Tokens Used: {tokensUsed.toLocaleString()}</span>
              <span>Tokens Remaining: {tokensRemaining.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3.5">
              <div
                className={`h-3.5 rounded-full transition-all duration-500 ease-out ${ tokensRemaining > 0 ? 'bg-primary' : 'bg-destructive'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {progress.toFixed(1)}% of free tokens used.
            </p>
          </div>
          {/* Display message when tokens are zero and not subscribed */}
          {tokensRemaining <= 0 && !isProSubscribed && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive-foreground">
              <Info className="inline h-4 w-4 mr-2" />
              You have used all your free tokens. Please subscribe to continue using AI features.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Zap className="mr-2 h-6 w-6 text-accent" /> EduVoice AI Pro Plan
          </CardTitle>
          <CardDescription>
            Unlock unlimited access to all AI features with our Pro plan for $10/month.
            Requires backend integration with Stripe for payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">$10<span className="text-xl font-normal text-muted-foreground">/month</span></p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Unlimited usage of AI-powered features
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Priority access to new features & AI models\n            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Support continued development of EduVoice AI\n            </li>
          </ul>
          <Separator />
          <div className="text-center">
            {isProSubscribed ? (
              <div className="space-y-2">
                 <p className="text-lg font-semibold text-green-600 flex items-center justify-center">
                    <CheckCircle className="mr-2 h-6 w-6" /> You are currently subscribed to Pro!
                </p>
                {/* Link to manage subscription - will require backend */}
                <Button variant="outline" onClick={handleManageSubscription}>
                    Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                 {subscriptionEndDate && (
                     <p className="text-sm text-muted-foreground">Renews on: {new Date(subscriptionEndDate).toLocaleDateString()}</p>
                 )}
              </div>
            ) : (
               // Show subscribe button if not subscribed
              <Button size="lg" onClick={handleSubscribe} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                Subscribe Now with Stripe <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Payments would be securely processed by Stripe. You can cancel anytime.
            </p>
          </div>
        </CardContent>
      </Card>

       <Card className="mt-6 bg-secondary/30 border-secondary">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            How Tokens & Subscriptions Work (Conceptual)\n            </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-semibold text-foreground">Tokens:</span> Units of data processed by AI models. Different actions (e.g., generating lectures, interview questions, feedback) consume tokens. Your initial {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens allow for substantial exploration.
          </p>
          <p>
            <span className="font-semibold text-foreground">Backend Logic:</span> Real token tracking (decrementing after AI calls), enforcing limits, and managing subscription status requires robust backend implementation using Appwrite (e.g., Appwrite Functions to interact with AI APIs and update user token counts, database to store user subscription status).\n          </p>
          <p>
            <span className="font-semibold text-foreground">Stripe Integration:</span> For actual subscriptions, a backend integration with Stripe is necessary to handle payments, webhooks (to update Appwrite user data on successful payment or cancellation), and manage subscription lifecycles.\n          </p>
          <p className="text-xs text-destructive mt-2">
             The token counts and subscription status shown on this page are currently conceptual and for UI demonstration purposes only. They do not reflect real-time data or enforce actual limits without backend implementation.\n          </p>
        </CardContent>
      </Card>
    </div>
  );
}
