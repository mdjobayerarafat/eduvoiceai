
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Construction } from "lucide-react";

export default function QAPrepPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <HelpCircle className="mr-3 h-8 w-8 text-primary" /> Q&A Prep
        </h1>
        <p className="text-muted-foreground mt-1">
          Sharpen your knowledge and prepare for questions on any subject.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Construction className="mr-2 h-6 w-6 text-accent" />
            Feature Coming Soon!
          </CardTitle>
          <CardDescription>
            We're actively working on the Q&A Prep feature. Soon, you'll be able to:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Submit topics or materials you want to be quizzed on.</li>
            <li>Receive AI-generated questions based on your input.</li>
            <li>Practice answering questions and get feedback (planned).</li>
            <li>Track your progress and identify areas for improvement.</li>
          </ul>
          <p className="text-sm text-foreground font-medium">
            Stay tuned for updates! This page will be updated as the feature becomes available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
