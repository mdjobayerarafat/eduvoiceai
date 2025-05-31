// src/app/(app)/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// This page is intended to be the entry point for the authenticated part of the app.
// However, it should not render any content itself for the root path '/'.
// The root path '/' is handled by src/app/page.tsx (the marketing landing page).

// If this file (src/app/(app)/page.tsx) exists and exports a default component,
// Next.js might still flag a "parallel routes" error during build or dev, even with
// this redirect logic, because it statically analyzes the file structure.

// The primary purpose of this page is to redirect authenticated users who might
// somehow land on '/' within the (app) group to their dashboard or a default app page.
// If a "parallel routes" error persists due to this file, the most robust solution
// is often to DELETE this file (src/app/(app)/page.tsx).
// Navigation to '/dashboard' would then be handled programmatically after login,
// and unauthenticated users would be caught by middleware or route protection
// in `src/app/(app)/layout.tsx` if needed.

export default function AppRootPage() {
  const router = useRouter();

  useEffect(() => {
    // Use replace to avoid adding this redirect to the browser history
    router.replace("/dashboard");
  }, [router]);

  // Display a loader or minimal content while redirecting
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Loading your dashboard...</p>
    </div>
  );
}
