
"use client";

import Link from "next/link";
import { BrainCircuit, Menu, Settings as SettingsIcon, UserCircle, LogOut, ShieldAlert } from "lucide-react";
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
import { APP_NAV_ITEMS, USER_NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants";
import { usePathname, useRouter } from "next/navigation";
import { account } from "@/lib/appwrite"; 
import { useToast } from "@/hooks/use-toast"; 
import { useEffect, useState } from "react";
import type { Models } from "appwrite"; 

const useAppwriteUser = () => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        // Check if the user has the 'admin' label in Appwrite.
        // This requires assigning the 'admin' label to admin users
        // in the Appwrite console (Users -> select user -> Labels).
        if (currentUser?.labels?.includes('admin')) { 
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        setUser(null); 
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { user, isLoading, isAdmin };
};

export function AppHeader() {
  const { user, isAdmin, isLoading } = useAppwriteUser(); 
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

  const isAdminPathActive = ADMIN_NAV_ITEMS.some(item => 
    (item.matchPaths && item.matchPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) || pathname === item.href
  );

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

      <div className="flex items-center gap-2 md:ml-auto md:gap-2 lg:gap-4">
        {!isLoading && isAdmin && ( 
          <Button variant="outline" size="sm" asChild className={`hidden md:flex bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary hover:text-primary ${isAdminPathActive ? "ring-2 ring-primary ring-offset-2" : ""}`}>
            <Link href="/admindashboard">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Admin Area
            </Link>
          </Button>
        )}
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
               {!isLoading && isAdmin && (
                <>
                  <DropdownMenuSeparator />
                   <Link
                    href="/admindashboard" 
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isAdminPathActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground font-medium"}`}
                  >
                    <ShieldAlert className="h-5 w-5" />
                    Admin Area
                  </Link>
                  {ADMIN_NAV_ITEMS.map((item) => (
                     <Link
                        key={item.label}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg pl-10 pr-3 py-2 transition-all hover:text-primary text-sm ${pathname === item.href || (item.matchPaths && item.matchPaths.some(p => pathname.startsWith(p))) ? "bg-muted text-primary" : "text-muted-foreground"}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                  ))}
                </>
              )}
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
            {!isLoading && isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admindashboard" className="font-medium text-primary">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </DropdownMenuItem>
              </>
            )}
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
