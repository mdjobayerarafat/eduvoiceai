
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentSuccessPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectCountdown, setRedirectCountdown] = useState(10);
  const [message, setMessage] = useState("Your subscription request has been processed. Your account should now be updated.");

  useEffect(() => {
    // Check if this page was reached after an API redirect that might have updated the DB
    const fromApiRedirect = searchParams.get('status') === 'confirmed'; // Example, not strictly needed if API always updates

    if (fromApiRedirect) { // This logic might be redundant if API always updates
      setMessage("Your EduVoice AI Pro Plan has been activated!");
    } else {
       // Default message if landed here directly or after Stripe but before API redirect (less likely with new flow)
       setMessage("Your payment was successful! Your account updates are being finalized.");
    }

    toast({
      title: "Payment Processed!",
      description: "Thank you for subscribing to EduVoice AI Pro. Your account details should reflect the update.",
      className: "bg-green-100 border-green-300 text-green-800",
      duration: 7000,
    });

    const timer = setInterval(() => {
      setRedirectCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [toast, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="font-headline text-3xl text-primary">Subscription Confirmed!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            You will be automatically redirected to your dashboard in {redirectCountdown} seconds.
          </p>
          <Button asChild size="lg" className="w-full mt-4">
            <Link href="/dashboard">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Go to Dashboard Now
            </Link>
          </Button>
        </CardContent>
      </Card>
       <p className="text-xs text-muted-foreground mt-6">
        If you are not redirected, please <Link href="/dashboard" className="underline hover:text-primary">click here to go to your dashboard</Link>.
      </p>
    </div>
  );
}
