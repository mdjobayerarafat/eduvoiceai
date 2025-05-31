
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Languages, Construction } from "lucide-react";

export default function LanguagePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Languages className="mr-3 h-8 w-8 text-primary" /> Learn Language
        </h1>
        <p className="text-muted-foreground mt-1">
          Enhance your linguistic skills with AI-powered interactive lessons.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Construction className="mr-2 h-6 w-6 text-accent" />
            Feature Coming Soon!
          </CardTitle>
          <CardDescription>
            We're actively developing the "Learn Language" feature. Soon, you'll be able to:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Choose from a variety of languages to learn.</li>
            <li>Engage in interactive conversations with an AI tutor.</li>
            <li>Practice vocabulary, grammar, and pronunciation.</li>
            <li>Receive personalized feedback and track your progress.</li>
          </ul>
          <p className="text-sm text-foreground font-medium">
            Stay tuned for updates! This page will be updated as the feature becomes available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
