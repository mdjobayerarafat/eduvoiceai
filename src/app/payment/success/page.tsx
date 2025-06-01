
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [redirectCountdown, setRedirectCountdown] = useState(10); // 10 seconds

  useEffect(() => {
    toast({
      title: "Payment Successful!",
      description: "Your subscription request has been processed. Your account will be updated shortly.",
      className: "bg-green-100 border-green-300 text-green-800",
      duration: 7000,
    });

    const timer = setInterval(() => {
      setRedirectCountdown((prevCount) => prevCount - 1);
    }, 1000);

    const redirectTimeout = setTimeout(() => {
      router.push("/dashboard");
    }, 10000); // Redirect after 10 seconds

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimeout);
    };
  }, [toast, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="font-headline text-3xl text-primary">Payment Successful!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            Your EduVoice AI Pro Plan activation is being processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Your account status and token balance will be updated shortly via our secure system. This usually takes a few moments.
          </p>
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
        If you are not redirected, please <Link href="/dashboard" className="underline hover:text-primary">click here to go to your dashboard</Link>. Refresh the dashboard to see your updated plan.
      </p>
    </div>
  );
}
