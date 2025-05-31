
"use client";

import Link from "next/link";
import { BrainCircuit, Menu, Settings as SettingsIcon, UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_NAV_ITEMS, USER_NAV_ITEMS } from "@/lib/constants";
import { usePathname, useRouter } from "next/navigation";
import { account } from "@/lib/appwrite"; // Import Appwrite account
import { useToast } from "@/hooks/use-toast"; // For logout feedback
import { useEffect, useState } from "react";
import type { Models } from "appwrite"; // Import Models for user type

// Placeholder for Appwrite user data - in a real app, this would be in a global context/store
const useAppwriteUser = () => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (error) {
        setUser(null); // No user logged in or error fetching
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { user, isLoading };
};

export function AppHeader() {
  const { user } = useAppwriteUser(); // Use Appwrite user hook
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Could not log you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base mr-auto md:mr-0">
        <BrainCircuit className="h-6 w-6 text-primary" />
        <span className="sr-only">EduVoice AI</span>
      </Link>
      
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 ml-auto">
        {APP_NAV_ITEMS.slice(0, 3).map((item) => (
           <Link
            key={item.label}
            href={item.href}
            className={`transition-colors hover:text-foreground ${pathname === item.href || (item.matchPaths && item.matchPaths.some(p => pathname.startsWith(p))) ? "text-foreground font-semibold" : "text-muted-foreground"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card">
            <nav className="grid gap-6 text-lg font-medium mt-8">
              <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <span>EduVoice AI</span>
              </Link>
              {APP_NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${pathname === item.href || (item.matchPaths && item.matchPaths.some(p => pathname.startsWith(p))) ? "bg-muted text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <UserCircle className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.name || user?.email || "My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {USER_NAV_ITEMS.map((item) => (
              <DropdownMenuItem key={item.label} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
