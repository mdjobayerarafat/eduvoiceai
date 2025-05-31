import Link from "next/link";
import { BrainCircuit } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Link href="/" className="flex items-center space-x-2 mb-8">
        <BrainCircuit className="h-8 w-8 text-primary" />
        <span className="font-bold font-headline text-2xl text-primary">EduVoice AI</span>
      </Link>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
