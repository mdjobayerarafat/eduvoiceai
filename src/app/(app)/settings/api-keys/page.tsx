
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Construction } from "lucide-react";

export default function ApiKeysPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Key className="mr-3 h-8 w-8 text-primary" /> Manage API Keys
        </h1>
        <p className="text-muted-foreground mt-1">
          Link your personal API keys for an enhanced experience.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Construction className="mr-2 h-6 w-6 text-accent" />
            Feature Coming Soon!
          </CardTitle>
          <CardDescription>
            We're currently developing the API Key management feature. Soon, you'll be able to:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Securely store and manage your API keys for services like OpenAI, Gemini, and Claude.</li>
            <li>Choose which key to use for specific features within EduVoice AI.</li>
            <li>Enjoy potentially higher usage limits or access to different models using your own keys.</li>
          </ul>
          <p className="text-sm text-foreground font-medium">
            Stay tuned for updates! This page will be updated once the feature is live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
