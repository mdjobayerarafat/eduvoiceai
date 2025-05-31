import { Greeting } from "@/components/dashboard/Greeting";
import { NavigationButtons } from "@/components/dashboard/NavigationButtons";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Separator } from "@/components/ui/separator";
import { BookCopy, FileText } from "lucide-react";

// Placeholder data
const recentLecturesData = [
  { id: "1", title: "Introduction to Quantum Physics", timestamp: "2 days ago", href: "/lectures/quantum-physics" },
  { id: "2", title: "The History of Ancient Rome", timestamp: "5 days ago", href: "/lectures/ancient-rome" },
];

const interviewFeedbackData = [
  { id: "1", title: "Software Engineer Mock Interview", timestamp: "1 week ago", href: "/interviews/feedback/1" },
  { id: "2", title: "Product Manager Behavioral Interview", timestamp: "3 weeks ago", href: "/interviews/feedback/2" },
];


export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Greeting />
      <p className="text-muted-foreground">
        Explore AI-powered tools to enhance your learning and preparation.
      </p>
      
      <Separator />

      <div>
        <h2 className="font-headline text-2xl font-semibold mb-4">Get Started</h2>
        <NavigationButtons />
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivityCard 
          title="Recent Lectures"
          icon={BookCopy}
          items={recentLecturesData}
          emptyMessage="No lectures generated yet."
          viewAllLink="/lectures/history" // Placeholder link
        />
        <RecentActivityCard
          title="Interview Feedback"
          icon={FileText}
          items={interviewFeedbackData}
          emptyMessage="No interview feedback available."
          viewAllLink="/interviews/history" // Placeholder link
        />
      </div>
    </div>
  );
}