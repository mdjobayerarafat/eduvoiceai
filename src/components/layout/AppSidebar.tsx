"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_ITEMS, SETTINGS_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BookHeart, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-card md:block w-64">
      <ScrollArea className="h-full py-4">
        <div className="px-3 py-2">
          <Link href="/dashboard" className="flex items-center pl-1 mb-6">
            <BookHeart className="h-7 w-7 mr-2 text-primary" />
            <h2 className="text-xl font-headline font-semibold text-primary">EduVoice AI</h2>
          </Link>
          
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</h3>
            {APP_NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                  (pathname === item.href || (item.matchPaths && item.matchPaths.some(p => pathname.startsWith(p)))) &&
                    "bg-primary/10 text-primary font-medium"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 px-3 py-2">
          <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </h3>
          <div className="space-y-1">
            {SETTINGS_NAV_ITEMS.map((item) => (
               <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                  (pathname === item.href || (item.matchPaths && item.matchPaths.some(p => pathname.startsWith(p)))) &&
                    "bg-primary/10 text-primary font-medium"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
