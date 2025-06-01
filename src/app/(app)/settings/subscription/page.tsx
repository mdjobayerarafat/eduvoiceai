
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, ExternalLink, Info, Zap, Coins, Loader2, AlertTriangle } from "lucide-react";
import { account, databases, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Models } from "appwrite";

// Define a more specific type for the document fetched from USERS_COLLECTION_ID
interface UserProfileDocument extends Models.Document {
  email: string;
  username: string;
  token_balance?: number;
  subscription_status?: "trial" | "active" | "cancelled" | "past_due";
  subscription_end_date?: string; // ISO date string
  // Add other fields from your USERS_COLLECTION_ID if needed
}


const FREE_TOKEN_ALLOWANCE = 60000; // This is a conceptual value, actual initial tokens are set at registration

export default function SubscriptionPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isProSubscribed, setIsProSubscribed] = useState<boolean>(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null); 
    try {
      const currentUser = await account.get(); // This gets the Appwrite Auth user
      if (!currentUser?.$id) {
        throw new AppwriteException("User not authenticated.", 401, "user_unauthorized");
      }
      setUserId(currentUser.$id);

      // Now fetch the custom user profile document from USERS_COLLECTION_ID
      if (APPWRITE_DATABASE_ID && USERS_COLLECTION_ID) {
        const userProfileDoc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          USERS_COLLECTION_ID,
          currentUser.$id // Use Appwrite Auth user ID as the document ID
        ) as UserProfileDocument;

        setTokenBalance(userProfileDoc.token_balance ?? 0);
        setIsProSubscribed(userProfileDoc.subscription_status === 'active');
        setSubscriptionEndDate(userProfileDoc.subscription_end_date ?? null);

      } else {
        throw new Error("Appwrite Database ID or Users Collection ID is not configured.");
      }

    } catch (err: any) {
      console.error("Failed to fetch user subscription data:", err);
      let specificError = "Failed to load your subscription information. Please try again.";
      if (err instanceof AppwriteException) {
          if (err.code === 401 || err.type === 'user_unauthorized') {
            toast({ title: "Session Expired", description: "Please log in again.", variant: "default" });
            router.push('/login');
            return; // Stop further execution if redirecting
          } else if (err.code === 404) {
            specificError = "Your user profile data could not be found. This might happen if your account setup is incomplete. Please contact support.";
          } else {
            specificError = `Appwrite error: ${err.message}`;
          }
      } else if (err instanceof Error) {
          specificError = err.message;
      }
      setError(specificError);
      toast({
          title: "Error Loading Subscription",
          description: specificError.substring(0, 150), // Keep toast brief
          variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // router and toast are stable, fetchUserData is memoized by being inside useEffect


  const handleSubscribe = () => {
    toast({
      title: "Stripe Integration Needed",
      description: "This would typically redirect you to Stripe to complete your subscription. Backend integration with Stripe is required.",
      duration: 5000,
    });
  };

  const handleManageSubscription = () => {
     toast({
      title: "Stripe Integration Needed",
      description: "This would typically redirect you to a Stripe customer portal to manage your subscription. Backend integration is required.",
      duration: 5000,
    });
  };

  // Calculate tokens remaining based on the fetched tokenBalance
  // The FREE_TOKEN_ALLOWANCE is conceptual here; the actual balance is `tokenBalance`.
  // We can show progress towards using the initial allowance IF the user is still on 'trial'
  // or has a balance that might relate to a free tier.
  const displayTokensUsed = tokenBalance !== null ? (FREE_TOKEN_ALLOWANCE - tokenBalance > 0 ? FREE_TOKEN_ALLOWANCE - tokenBalance : 0) : 0;
  const displayTokensRemaining = tokenBalance !== null ? tokenBalance : 0;
  const displayProgress = FREE_TOKEN_ALLOWANCE > 0 ? (displayTokensUsed / FREE_TOKEN_ALLOWANCE) * 100 : 0;


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Subscription Info...</p>
      </div>
    );
  }

   if (error && !isLoading) { // Ensure error is shown only after loading finishes
    return (
      <div className="space-y-8 text-center">
        <Card className="max-w-md mx-auto border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center justify-center">
                    <AlertTriangle className="mr-2 h-6 w-6" /> Error Loading Data
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive-foreground mb-4">{error}</p>
                <Button onClick={fetchUserData} variant="outline">Retry Loading</Button>
            </CardContent>
        </Card>
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
             Your current token balance for using AI features. Initial free allowance is {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Tokens Used (from initial allowance): {displayTokensUsed.toLocaleString()}</span>
              <span>Tokens Balance: <span className="font-bold">{displayTokensRemaining.toLocaleString()}</span></span>
            </div>
            <div className="w-full bg-muted rounded-full h-3.5">
              <div
                className={`h-3.5 rounded-full transition-all duration-500 ease-out ${ displayTokensRemaining > 0 ? 'bg-primary' : 'bg-destructive'}`}
                style={{ width: `${Math.min(100, displayProgress)}%` }} // Cap progress at 100%
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {Math.min(100, displayProgress).toFixed(1)}% of initial free tokens used.
            </p>
          </div>
          {displayTokensRemaining <= 0 && !isProSubscribed && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive-foreground">
              <Info className="inline h-4 w-4 mr-2" />
              You have used all your free tokens or have a zero balance. Please subscribe to continue using AI features or purchase more tokens (feature coming soon).
            </Alert>
          )}
           {isProSubscribed && (
            <Alert className="bg-green-500/10 border-green-500/30 text-green-700">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="font-semibold">Pro Plan Active!</AlertTitle>
                <AlertDescription>
                    You have unlimited token usage with your Pro subscription.
                    {subscriptionEndDate && ` Your plan renews on ${new Date(subscriptionEndDate).toLocaleDateString()}.`}
                </AlertDescription>
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
              Priority access to new features & AI models
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Support continued development of EduVoice AI
            </li>
          </ul>
          <Separator />
          <div className="text-center">
            {isProSubscribed ? (
              <div className="space-y-2">
                 <p className="text-lg font-semibold text-green-600 flex items-center justify-center">
                    <CheckCircle className="mr-2 h-6 w-6" /> You are currently subscribed to Pro!
                </p>
                <Button variant="outline" onClick={handleManageSubscription}>
                    Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                 {subscriptionEndDate && (
                     <p className="text-sm text-muted-foreground mt-1">Current period ends: {new Date(subscriptionEndDate).toLocaleDateString()}</p>
                 )}
              </div>
            ) : (
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
            How Tokens & Subscriptions Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-semibold text-foreground">Tokens:</span> Units of data processed by AI models. Different actions (e.g., generating lectures, interview questions, feedback) consume tokens. Your initial {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens allow for substantial exploration. Your current balance is fetched from your user profile.
          </p>
          <p>
            <span className="font-semibold text-foreground">Backend Logic:</span> Real token tracking (decrementing after AI calls), enforcing limits, and managing subscription status requires robust backend implementation using Appwrite (e.g., Appwrite Functions to interact with AI APIs and update user token counts in the 'users' collection, and to manage subscription status based on Stripe webhooks).
          </p>
          <p>
            <span className="font-semibold text-foreground">Stripe Integration:</span> For actual subscriptions, a backend integration with Stripe is necessary to handle payments, webhooks (to update Appwrite user data in the 'users' collection on successful payment or cancellation), and manage subscription lifecycles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

