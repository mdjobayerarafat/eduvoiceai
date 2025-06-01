
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, ExternalLink, Info, Zap, Coins, Loader2, AlertTriangle, Ticket } from "lucide-react";
import { account, databases, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Models } from "appwrite";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define a more specific type for the document fetched from USERS_COLLECTION_ID
interface UserProfileDocument extends Models.Document {
  email: string;
  username: string;
  token_balance?: number;
  subscription_status?: "trial" | "active" | "cancelled" | "past_due";
  subscription_end_date?: string; // ISO date string
}

const FREE_TOKEN_ALLOWANCE = 60000; 
const VOUCHER_TOKEN_GRANT = 60000;
const SUBSCRIPTION_TOKEN_GRANT = 60000;


export default function SubscriptionPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isProSubscribed, setIsProSubscribed] = useState<boolean>(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [voucherCode, setVoucherCode] = useState("");
  const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);


  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null); 
    try {
      const currentUser = await account.get(); 
      if (!currentUser?.$id) {
        throw new AppwriteException("User not authenticated.", 401, "user_unauthorized");
      }
      setUserId(currentUser.$id);

      if (APPWRITE_DATABASE_ID && USERS_COLLECTION_ID) {
        const userProfileDoc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          USERS_COLLECTION_ID,
          currentUser.$id 
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
            return; 
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
          description: specificError.substring(0, 150), 
          variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handleSubscribe = async () => {
    if (!userId) {
      toast({ title: "Error", description: "User not identified. Please refresh.", variant: "destructive" });
      return;
    }
    setIsSubscribing(true);
    try {
      const response = await fetch('/api/stripe/confirm-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to confirm subscription.");
      }

      toast({
        title: "Subscription Activated!",
        description: result.message || `Successfully added ${SUBSCRIPTION_TOKEN_GRANT.toLocaleString()} tokens and activated Pro plan.`,
        className: "bg-green-100 border-green-300 text-green-800"
      });
      setTokenBalance(result.newTokenBalance);
      setIsProSubscribed(result.newSubscriptionStatus === 'active');
      setSubscriptionEndDate(result.newSubscriptionEndDate);
      // Optionally, re-fetch all user data to ensure complete consistency
      // await fetchUserData(); 

    } catch (err: any) {
      toast({
        title: "Subscription Failed",
        description: err.message || "An unknown error occurred while subscribing.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };


  const handleManageSubscription = () => {
     toast({
      title: "Stripe Integration Needed",
      description: "This would typically redirect you to a Stripe customer portal to manage your subscription. Backend integration is required.",
      duration: 5000,
    });
  };

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      toast({ title: "Voucher Code Required", description: "Please enter a voucher code.", variant: "destructive" });
      return;
    }
    if (!userId) {
      toast({ title: "Error", description: "User not identified. Please refresh.", variant: "destructive" });
      return;
    }
    setIsRedeemingVoucher(true);
    try {
      const response = await fetch('/api/user/redeem-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, voucherCode: voucherCode.trim().toUpperCase() }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to redeem voucher.");
      }

      toast({
        title: "Voucher Redeemed!",
        description: result.message || `Successfully added ${VOUCHER_TOKEN_GRANT.toLocaleString()} tokens.`,
        className: "bg-green-100 border-green-300 text-green-800"
      });
      setTokenBalance(result.newTokenBalance); // Update token balance from API response
      setVoucherCode(""); // Clear input
      // Re-fetch user data to get latest balance and potentially other statuses
      // await fetchUserData(); 

    } catch (err: any) {
      toast({
        title: "Voucher Redemption Failed",
        description: err.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsRedeemingVoucher(false);
    }
  };

  const displayTokensUsed = tokenBalance !== null ? (FREE_TOKEN_ALLOWANCE - tokenBalance > 0 ? FREE_TOKEN_ALLOWANCE - tokenBalance : 0) : 0;
  const displayTokensRemaining = tokenBalance !== null ? tokenBalance : 0;
  const displayProgress = FREE_TOKEN_ALLOWANCE > 0 && tokenBalance !== null && !isProSubscribed ? Math.min(100, ((FREE_TOKEN_ALLOWANCE - tokenBalance) / FREE_TOKEN_ALLOWANCE) * 100) : (isProSubscribed ? 100 : 0);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Subscription Info...</p>
      </div>
    );
  }

   if (error && !isLoading) { 
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
          Manage your EduVoice AI plan, track your token usage, and redeem vouchers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Coins className="mr-2 h-6 w-6 text-yellow-500" /> Your Token Usage
          </CardTitle>
          <CardDescription>
             Your current token balance for using AI features. Initial free allowance is {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens. Vouchers and subscriptions grant more tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>
                Tokens Balance: <span className="font-bold text-lg">{displayTokensRemaining.toLocaleString()}</span>
              </span>
              {!isProSubscribed && tokenBalance !== null && tokenBalance < FREE_TOKEN_ALLOWANCE && (
                <span>Initial Free Tokens Used: {displayTokensUsed.toLocaleString()} / {FREE_TOKEN_ALLOWANCE.toLocaleString()}</span>
              )}
            </div>
            {!isProSubscribed && tokenBalance !== null && (
                <div className="w-full bg-muted rounded-full h-3.5">
                <div
                    className={`h-3.5 rounded-full transition-all duration-500 ease-out ${ displayTokensRemaining > 0 ? 'bg-primary' : 'bg-destructive'}`}
                    style={{ width: `${displayTokensRemaining > 0 ? Math.min(100, (displayTokensRemaining / FREE_TOKEN_ALLOWANCE) * 100) : 0}%` }}
                ></div>
                </div>
            )}
             {!isProSubscribed && tokenBalance !== null && (
                <p className="text-xs text-muted-foreground mt-1 text-center">
                {displayTokensRemaining > 0 ? `${Math.min(100, (displayTokensRemaining / FREE_TOKEN_ALLOWANCE) * 100).toFixed(1)}% of initial free tokens remaining.` : "No free tokens remaining."}
                </p>
            )}
          </div>
          {displayTokensRemaining <= 0 && !isProSubscribed && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive-foreground">
              <Info className="inline h-4 w-4 mr-2" />
              You have used all your free tokens or have a zero balance. Redeem a voucher or subscribe to continue using AI features.
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
            <Ticket className="mr-2 h-6 w-6 text-green-600" /> Redeem Voucher
          </CardTitle>
          <CardDescription>
            Have a voucher code? Enter it here to add {VOUCHER_TOKEN_GRANT.toLocaleString()} tokens to your balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRedeemVoucher} className="space-y-4">
            <div>
              <Label htmlFor="voucherCode">Voucher Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="voucherCode"
                  name="voucherCode"
                  placeholder="Enter your voucher code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  disabled={isRedeemingVoucher || isLoading}
                  className="flex-grow"
                />
                <Button type="submit" disabled={isRedeemingVoucher || isLoading || !voucherCode.trim()}>
                  {isRedeemingVoucher ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Redeem
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Zap className="mr-2 h-6 w-6 text-accent" /> EduVoice AI Pro Plan
          </CardTitle>
          <CardDescription>
            Unlock unlimited access to all AI features with our Pro plan for $10/month.
            This is a conceptual subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">$10<span className="text-xl font-normal text-muted-foreground">/month</span></p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Adds {SUBSCRIPTION_TOKEN_GRANT.toLocaleString()} tokens to your balance upon subscription.
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Token usage is effectively unlimited (deductions skipped while active).
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Priority access to new features & AI models (conceptual).
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Support continued development of EduVoice AI.
            </li>
          </ul>
          <Separator />
          <div className="text-center">
            {isProSubscribed ? (
              <div className="space-y-2">
                 <p className="text-lg font-semibold text-green-600 flex items-center justify-center">
                    <CheckCircle className="mr-2 h-6 w-6" /> You are currently subscribed to Pro!
                </p>
                <Button variant="outline" onClick={handleManageSubscription} disabled={isSubscribing}>
                    Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                 {subscriptionEndDate && (
                     <p className="text-sm text-muted-foreground mt-1">Current period ends: {new Date(subscriptionEndDate).toLocaleDateString()}</p>
                 )}
              </div>
            ) : (
              <Button 
                size="lg" 
                onClick={handleSubscribe} 
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isSubscribing || isLoading}
              >
                {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {isSubscribing ? "Processing Subscription..." : "Subscribe Now"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Actual payments would be securely processed by Stripe. You can cancel anytime.
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
            <span className="font-semibold text-foreground">Tokens:</span> Your initial {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens allow for exploration. Vouchers and Pro plan activation add more tokens.
          </p>
           <p>
            <span className="font-semibold text-foreground">Pro Plan:</span> While the Pro plan is active (subscription\_status = 'active'), the token deduction API will skip actual deductions, effectively giving unlimited usage. Subscribing also grants a one-time bonus of {SUBSCRIPTION_TOKEN_GRANT.toLocaleString()} tokens.
          </p>
          <p>
            <span className="font-semibold text-foreground">Backend Logic:</span> Real token tracking, enforcing limits, and managing subscription status requires backend implementation using Appwrite Functions to interact with AI APIs, update user token counts, and manage subscription status based on Stripe webhooks.
          </p>
          <p>
            <span className="font-semibold text-foreground">Stripe Integration:</span> For actual subscriptions, a backend integration with Stripe is necessary to handle payments and subscription lifecycles, which then updates user data in Appwrite. This implementation simulates the post-payment confirmation step.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

