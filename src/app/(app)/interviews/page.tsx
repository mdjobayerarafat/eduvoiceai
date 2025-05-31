
"use client";

import { InterviewSetup } from "@/components/interviews/InterviewSetup";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MockInterviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-semibold">Mock Interview</h1>
        <p className="text-muted-foreground mt-1">
          Practice your interviewing skills. Provide the job details and your resume to get started.
        </p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Interview Setup</CardTitle>
          <CardDescription>
            Fill in the details below to configure your mock interview session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InterviewSetup />
        </CardContent>
      </Card>
    </div>
  );
}
