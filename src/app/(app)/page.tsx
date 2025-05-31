
// src/app/(app)/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page serves as the root for the authenticated (app) section.
 * Its primary purpose is to redirect users to the main dashboard.
 *
 * ===================================================================================
 * IMPORTANT NOTE ON "PARALLEL PAGES" ERROR:
 * ===================================================================================
 * If you are consistently seeing an error from Next.js like:
 *   "You cannot have two parallel pages that resolve to the same path.
 *    Conflicting pages: /src/app/page.tsx and /src/app/(app)/page.tsx"
 *
 * This means Next.js's static analysis is detecting a conflict because both
 * `src/app/page.tsx` (your main marketing/landing page) AND this file
 * (`src/app/(app)/page.tsx`) are trying to serve the root path (`/`).
 * The `(app)` directory is a Route Group and does NOT add to the URL path.
 *
 * While this redirect logic is the standard pattern for a page at the root of an
 * authenticated group, Next.js might still flag the conflict based on the mere
 * *existence* of both files targeting the same path, before this redirect can run.
 *
 * IF THE ERROR PERSISTS EVEN WITH THIS REDIRECT IN PLACE (AND AFTER A SERVER RESTART):
 * THE MOST LIKELY AND DEFINITIVE SOLUTION IS TO MANUALLY DELETE THIS FILE
 * (`src/app/(app)/page.tsx`) FROM YOUR PROJECT.
 *
 * Navigation to `/dashboard` (or any other page in the `(app)` group) would then
 * occur programmatically (e.g., after a successful login redirects to `/dashboard`)
 * or via direct links, and `src/app/page.tsx` would be the sole handler for the `/` path.
 * ===================================================================================
 */
export default function AppRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  // Return null or a minimal loading indicator.
  // This content will likely not be visible due to the immediate redirect.
  return null;
}
