import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, BookOpen, Mic, MessageSquare, Languages, Sparkles, Users, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const features = [
  {
    icon: <BookOpen className="h-8 w-8 text-primary" />,
    title: "Topic-Based Lectures",
    description: "AI generates comprehensive lectures on any topic you choose.",
  },
  {
    icon: <Mic className="h-8 w-8 text-primary" />,
    title: "Mock Interviews",
    description: "Practice interviews with an AI interviewer and get instant feedback.",
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-primary" />,
    title: "Q&A Prep",
    description: "Prepare for questions on any subject with AI-driven assistance.",
  },
  {
    icon: <Languages className="h-8 w-8 text-primary" />,
    title: "Language Learning",
    description: "Improve your language skills with interactive AI tutors.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary">
                  EduVoice AI
                </h1>
                <p className="font-headline text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl/none text-foreground">
                  Revolutionize Learning with AI-Powered Voice Agent <span role="img" aria-label="microphone">🎤</span><span role="img" aria-label="books">📚</span>
                </p>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Unlock your potential with personalized AI tutors for lectures, interview practice, language learning, and more.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/register">
                    Get Started
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://placehold.co/600x400.png"
              alt="Hero"
              width={600}
              height={400}
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-lg"
              data-ai-hint="education technology"
            />
          </div>
        </div>
      </section>

      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground font-medium">Key Features</div>
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl text-primary">
                Everything You Need to Succeed
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our platform offers a comprehensive suite of AI-powered tools designed to enhance your learning experience.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 xl:grid-cols-2 pt-12">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    {feature.icon}
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
           <div className="mx-auto grid max-w-5xl items-start gap-6 pt-12 sm:grid-cols-1 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-4">
              <Users className="h-10 w-10 mb-3 text-accent" />
              <h3 className="font-headline text-lg font-semibold mb-1">Admin Panel</h3>
              <p className="text-sm text-muted-foreground">Manage users, track activity, and issue vouchers.</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <Settings className="h-10 w-10 mb-3 text-accent" />
              <h3 className="font-headline text-lg font-semibold mb-1">API Key Integration</h3>
              <p className="text-sm text-muted-foreground">Use your own OpenAI, Gemini, or Claude keys.</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <ShieldCheck className="h-10 w-10 mb-3 text-accent" />
              <h3 className="font-headline text-lg font-semibold mb-1">Secure Authentication</h3>
              <p className="text-sm text-muted-foreground">Reliable email/password and Google OAuth login.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 border-t">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight text-primary">
              Ready to Transform Your Learning?
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Join EduVoice AI today and experience the future of education.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
             <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/register">
                Sign Up Now
                <CheckCircle className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}