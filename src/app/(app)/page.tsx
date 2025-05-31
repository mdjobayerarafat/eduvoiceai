// src/app/(app)/page.tsx
import { redirect } from 'next/navigation';

/**
 * This page is at the root of the (app) route group.
 * Its primary purpose is to redirect users to the main dashboard page.
 * If the error "You cannot have two parallel pages that resolve to the same path"
 * persists, it's likely because Next.js detects a structural conflict between
 * this file (src/app/(app)/page.tsx) and src/app/page.tsx, both aiming for the
 * root ('/') path, during its static analysis of the file system. In such cases,
 * the content of this file (even this redirect) might not prevent the error,
 * and the file src/app/(app)/page.tsx might need to be removed.
 */
export default function AppRootPage() {
  redirect('/dashboard');
  // The redirect function throws a NEXT_REDIRECT error,
  // which terminates rendering of this route segment and navigates.
}
