
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
import Link from "next/link";


interface UserProfileDocument extends Models.Document {
  email: string;
  username: string;
  token_balance?: number;
  subscription_status?: "trial" | "active" | "cancelled" | "past_due";
  subscription_end_date?: string; 
}

const FREE_TOKEN_ALLOWANCE = 60000;
const VOUCHER_TOKEN_GRANT = 60000;

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_aFabJ15XegELgrT3CV8og00";


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
  const [isProcessingStripeRedirect, setIsProcessingStripeRedirect] = useState(false);


  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await account.get();
      if (!currentUser?.$id) {
        throw new AppwriteException("User not authenticated.", 401, "user_unauthorized");
      }
      setUserId(currentUser.$id);
      console.log("SubscriptionPage: Fetched Appwrite User ID for Stripe:", currentUser.$id); // Log User ID

      if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
        throw new Error("Appwrite Database ID or Users Collection ID is not configured.");
      }

      const userProfileDoc = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        USERS_COLLECTION_ID,
        currentUser.$id
      ) as UserProfileDocument;

      setTokenBalance(userProfileDoc.token_balance ?? 0);
      setIsProSubscribed(userProfileDoc.subscription_status === 'active');
      setSubscriptionEndDate(userProfileDoc.subscription_end_date ?? null);

    } catch (err: any) {
      let specificError = "Failed to load your subscription information. Please try again.";
      let toastTitle = "Error Loading Subscription";

      if (err instanceof AppwriteException) {
          if (err.code === 401 || err.type === 'user_unauthorized') {
            toast({ title: "Session Expired", description: "Please log in again.", variant: "default" });
            router.push('/login');
            return;
          } else if (err.code === 404) {
            specificError = "Your user profile data could not be found. This might happen if your account setup is incomplete or the document does not exist. Please contact support.";
            toastTitle = "Profile Not Found";
          } else if (err.message && err.message.toLowerCase().includes("failed to fetch")) {
            specificError = `Appwrite error: ${err.message}. This often indicates a network issue, a problem with the Appwrite server's reachability, or a CORS configuration error. Please ensure your Appwrite server is running and accessible, and check your Appwrite project's platform settings for correct hostnames. Also, verify your NEXT_PUBLIC_APPWRITE_ENDPOINT in the .env file.`;
            toastTitle = "Network/CORS or Endpoint Error";
          } else {
            specificError = `Appwrite error (Type: ${err.type || 'unknown'}, Code: ${err.code || 'N/A'}): ${err.message}`;
          }
      } else if (err instanceof Error) {
          specificError = err.message;
           if (err.message.includes("Database ID or Users Collection ID is not configured")) {
              toastTitle = "Client Configuration Error";
          }
      }
      console.error("Failed to fetch user subscription data:", err);
      setError(specificError);
      toast({
          title: toastTitle,
          description: specificError.substring(0, 250) + (specificError.length > 250 ? "..." : ""),
          variant: "destructive",
          duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSubscribeWithStripe = () => {
    if (!userId) {
      toast({ title: "User Not Identified", description: "Please ensure you are logged in and user data is loaded. Refresh if needed.", variant: "destructive" });
      return;
    }
    if (!STRIPE_PAYMENT_LINK) {
      toast({ title: "Configuration Error", description: "Stripe payment link is not configured.", variant: "destructive" });
      return;
    }
    setIsProcessingStripeRedirect(true);
    toast({ title: "Redirecting to Stripe...", description: "You will be redirected to our secure payment page." });
    
    // IMPORTANT: Ensure `userId` is correctly passed to Stripe.
    // Stripe will use this as `client_reference_id` and pass it back to your success_url and webhook.
    console.log(`SubscriptionPage: Redirecting to Stripe with client_reference_id: "${userId}"`);
    const stripeLinkWithParams = `${STRIPE_PAYMENT_LINK}?client_reference_id=${encodeURIComponent(userId)}`;
    
    window.location.href = stripeLinkWithParams;
  };


  const handleManageSubscription = () => {
     toast({
      title: "Manage Subscription (Conceptual)",
      description: "For a live Stripe integration, this would redirect to a Stripe customer portal. This button is conceptual for now as payment processing is handled via Payment Links and webhooks.",
      duration: 7000,
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
      setTokenBalance(result.newTokenBalance);
      setVoucherCode("");

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
                    Your Pro subscription is active.
                    {subscriptionEndDate && ` Your current period ends on ${new Date(subscriptionEndDate).toLocaleDateString()}.`}
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
            Unlock enhanced features with our Pro plan for $10/month. Payment processed via Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">$10<span className="text-xl font-normal text-muted-foreground">/month</span></p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Receive a 60,000 token bonus upon successful subscription.
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Token deductions for AI features are skipped while your subscription is active.
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
                <Button variant="outline" onClick={handleManageSubscription} disabled={isProcessingStripeRedirect}>
                    Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                 {subscriptionEndDate && (
                     <p className="text-sm text-muted-foreground mt-1">Current period ends: {new Date(subscriptionEndDate).toLocaleDateString()}</p>
                 )}
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleSubscribeWithStripe}
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isProcessingStripeRedirect || isLoading}
              >
                {isProcessingStripeRedirect ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                {isProcessingStripeRedirect ? "Redirecting to Payment..." : "Subscribe with Stripe"}
              </Button>
            )}
             <p className="text-xs text-muted-foreground mt-2">
                You will be redirected to Stripe to complete your payment. Ensure Success URL in Stripe Payment Link is: YOUR_APP_URL/api/stripe/confirm-success
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
            <span className="font-semibold text-foreground">Tokens:</span> Your initial {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens allow for exploration. Vouchers add more.
          </p>
           <p>
            <span className="font-semibold text-foreground">Pro Plan:</span> While the Pro plan is active (confirmed via Stripe webhook or success redirect), token deductions are skipped. Subscribing also grants a one-time bonus of 60,000 tokens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

