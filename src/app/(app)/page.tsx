
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * This page exists at the root of the (app) route group.
 * Its primary purpose is to redirect authenticated users to the /dashboard.
 * 
 * IMPORTANT: If you are seeing a Next.js error like "You cannot have two parallel pages that resolve to the same path"
 * (pointing to src/app/(app) and src/app/page.tsx), it means Next.js's static analysis
 * is detecting a conflict because both this file and src/app/page.tsx (your marketing page)
 * are trying to serve the root path ('/').
 * 
 * While this redirect *should* handle runtime navigation, the static analysis conflict
 * might persist. If it does, the most common and definitive solution is to **DELETE THIS FILE** 
 * (src/app/(app)/page.tsx).
 * 
 * After deleting this file, ensure your authentication flow (e.g., in your login form)
 * explicitly redirects users to `/dashboard` upon successful login.
 * Direct navigation to '/' would then always show the marketing page from src/app/page.tsx.
 */
export default function AppRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting to your dashboard...</p>
    </div>
  );
}
