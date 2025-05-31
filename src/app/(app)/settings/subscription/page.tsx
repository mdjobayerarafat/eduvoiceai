
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, ExternalLink, Info, Zap } from "lucide-react";

// Placeholder for actual token usage and subscription status
// In a real app, these would come from your backend/user data
const userTokenUsage = 15000; // Example: 15,000 tokens used
const freeTokenAllowance = 60000;
const isSubscribed = false; // Example: user is not subscribed

export default function SubscriptionPage() {
  const { toast } = useToast();

  const handleSubscribe = () => {
    // In a real app, this would redirect to a Stripe checkout page
    toast({
      title: "Subscription Action",
      description: "This would typically redirect you to Stripe to complete your subscription.",
    });
  };

  const tokensRemaining = Math.max(0, freeTokenAllowance - userTokenUsage);
  const progress = freeTokenAllowance > 0 ? (userTokenUsage / freeTokenAllowance) * 100 : 0;

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
            <Zap className="mr-2 h-6 w-6 text-yellow-500" /> Your Token Usage
          </CardTitle>
          <CardDescription>
            You receive {freeTokenAllowance.toLocaleString()} free tokens to explore EduVoice AI. Actual token tracking and decrementing would be implemented on the backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Tokens Used (Example): {userTokenUsage.toLocaleString()}</span>
              <span>Tokens Remaining (Example): {tokensRemaining.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {progress.toFixed(1)}% of free tokens used (example data).
            </p>
          </div>
          {tokensRemaining === 0 && !isSubscribed && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive-foreground">
              <Info className="inline h-4 w-4 mr-1" />
              You have used all your free tokens (example). Please subscribe to continue using AI features.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">EduVoice AI Pro Plan</CardTitle>
          <CardDescription>
            Unlock unlimited access to all AI features with our Pro plan for $10/month (via Stripe integration - not yet implemented).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">$10<span className="text-xl font-normal text-muted-foreground">/month</span></p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Unlimited access to all AI-powered features (once subscribed)
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Priority access to new features
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Enhanced AI models (when available)
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Support continued development of EduVoice AI
            </li>
          </ul>
          <Separator />
          <div className="text-center">
            {isSubscribed ? (
              <Button variant="outline" disabled>
                <CheckCircle className="mr-2 h-5 w-5" /> Currently Subscribed (Example)
              </Button>
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
       <Card className="mt-6 bg-secondary/30">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            How Tokens Work (Conceptual)
            </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Tokens are units of text or data processed by AI models. Different actions (e.g., generating lectures, interview questions, feedback) would consume tokens.
          </p>
          <ul className="list-disc list-inside pl-4">
            <li>Generating a short lecture summary might use a few hundred tokens.</li>
            <li>A detailed lecture or a full mock interview session can use several thousand tokens.</li>
          </ul>
          <p>
            Your initial {freeTokenAllowance.toLocaleString()} tokens allow for substantial exploration. The Pro plan would offer unlimited access. Actual token tracking and integration with AI calls need backend implementation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
