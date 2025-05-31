
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Construction } from "lucide-react";

export default function MeditationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Smile className="mr-3 h-8 w-8 text-primary" /> Meditation
        </h1>
        <p className="text-muted-foreground mt-1">
          Find calm and focus with guided AI meditation sessions.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Construction className="mr-2 h-6 w-6 text-accent" />
            Feature Coming Soon!
          </CardTitle>
          <CardDescription>
            We're working on bringing you AI-powered meditation. Soon, you'll be able to:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Choose from various meditation themes and durations.</li>
            <li>Experience personalized guided sessions.</li>
            <li>Track your meditation practice and progress.</li>
            <li>Integrate mindfulness into your daily routine.</li>
          </ul>
          <p className="text-sm text-foreground font-medium">
            Stay tuned for updates! This page will be updated as the feature becomes available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
