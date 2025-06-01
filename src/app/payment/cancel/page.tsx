
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, BrainCircuit } from "lucide-react"; // Added BrainCircuit
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-destructive/10 via-background to-background p-4">
       <Link href="/" className="flex items-center space-x-2 mb-8 text-primary">
            <BrainCircuit className="h-8 w-8" />
            <span className="font-bold font-headline text-2xl">EduVoice AI</span>
        </Link>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
          <CardTitle className="font-headline text-3xl text-destructive">Payment Cancelled</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your payment process was not completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm">
            It looks like you cancelled the payment or something went wrong. Your subscription has not been activated.
            If you believe this is an error, please try again or contact support.
          </p>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/settings/subscription">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subscription Options
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
