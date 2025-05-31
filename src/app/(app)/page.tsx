// src/app/(app)/page.tsx
import { redirect } from 'next/navigation';

/**
 * This page is at the root of the (app) route group.
 * Its primary purpose is to redirect users to the main dashboard page.
 * 
 * IMPORTANT:
 * If you are still seeing the error "You cannot have two parallel pages that 
 * resolve to the same path" after this file has been updated and your server
 * restarted, it means Next.js is detecting a structural conflict at the
 * file system level. This is because both:
 *   1. src/app/page.tsx (your marketing page)
 *   2. src/app/(app)/page.tsx (this file, even with a redirect)
 * are attempting to serve the root path ('/').
 * 
 * In such a persistent case, the most direct and recommended solution is to 
 * REMOVE this file (src/app/(app)/page.tsx) from your project. 
 * Your src/app/page.tsx will then be the sole handler for the root path. 
 * Navigation into the (app) group (e.g., to /dashboard) will occur through 
 * other means, such as links or programmatic navigation after login.
 */
export default function AppRootPage() {
  // This redirect function throws a NEXT_REDIRECT error,
  // which Next.js catches to perform the actual navigation.
  // This ensures this component does not attempt to render any content itself.
  redirect('/dashboard');
}
