
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, ExternalLink, Info, Zap, Coins } from "lucide-react";

// Conceptual user data: In a real app, this would come from your backend/user context via Appwrite
const conceptualUserData = {
  tokensUsed: 15000, // Example: 15,000 tokens used
  isSubscribed: false, // Example: user is not subscribed
  // In a real app, you might also have:
  // freeTokensLastReset: new Date(), 
  // subscriptionEndDate: new Date(),
};
const FREE_TOKEN_ALLOWANCE = 60000;

export default function SubscriptionPage() {
  const { toast } = useToast();

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

  const tokensRemaining = Math.max(0, FREE_TOKEN_ALLOWANCE - conceptualUserData.tokensUsed);
  const progress = FREE_TOKEN_ALLOWANCE > 0 ? (conceptualUserData.tokensUsed / FREE_TOKEN_ALLOWANCE) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <CreditCard className="mr-3 h-8 w-8 text-primary" /> Subscription & Usage
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your EduVoice AI plan and track your conceptual token usage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Coins className="mr-2 h-6 w-6 text-yellow-500" /> Your Token Usage (Conceptual)
          </CardTitle>
          <CardDescription>
            You receive {FREE_TOKEN_ALLOWANCE.toLocaleString()} free tokens to explore EduVoice AI.
            Actual token tracking and decrementing requires backend implementation with Appwrite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Tokens Used: {conceptualUserData.tokensUsed.toLocaleString()}</span>
              <span>Tokens Remaining: {tokensRemaining.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3.5">
              <div
                className="bg-primary h-3.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {progress.toFixed(1)}% of free tokens used.
            </p>
          </div>
          {tokensRemaining === 0 && !conceptualUserData.isSubscribed && (
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
              Priority access to new features & AI models
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              Support continued development of EduVoice AI
            </li>
          </ul>
          <Separator />
          <div className="text-center">
            {conceptualUserData.isSubscribed ? (
              <div className="space-y-2">
                 <p className="text-lg font-semibold text-green-600 flex items-center justify-center">
                    <CheckCircle className="mr-2 h-6 w-6" /> You are currently subscribed to Pro!
                </p>
                <Button variant="outline" onClick={handleManageSubscription}>
                    Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
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
            How Tokens & Subscriptions Work (Conceptual)
            </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-semibold text-foreground">Tokens:</span> Units of data processed by AI models. Different actions (e.g., generating lectures, interview questions, feedback) consume tokens. Your initial {FREE_TOKEN_ALLOWANCE.toLocaleString()} tokens allow for substantial exploration.
          </p>
          <p>
            <span className="font-semibold text-foreground">Backend Logic:</span> Real token tracking (decrementing after AI calls), enforcing limits, and managing subscription status requires robust backend implementation using Appwrite (e.g., Appwrite Functions to interact with AI APIs and update user token counts, database to store user subscription status).
          </p>
          <p>
            <span className="font-semibold text-foreground">Stripe Integration:</span> For actual subscriptions, a backend integration with Stripe is necessary to handle payments, webhooks (to update Appwrite user data on successful payment or cancellation), and manage subscription lifecycles.
          </p>
          <p className="text-xs text-destructive mt-2">
             The token counts and subscription status shown on this page are currently conceptual and for UI demonstration purposes only. They do not reflect real-time data or enforce actual limits without backend implementation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
