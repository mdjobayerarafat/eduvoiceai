import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAV_ITEMS } from "@/lib/constants"; // Using the main nav items
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Filter out Dashboard from APP_NAV_ITEMS if it exists
const dashboardNavItems = APP_NAV_ITEMS.filter(item => item.href !== '/dashboard');


export function NavigationButtons() {
  return (
    <>
    {/* Placeholder for admin check */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {dashboardNavItems.map((item) => (
        <Link href={item.href} key={item.label} legacyBehavior>
          <a className="block hover:no-underline">
            <Card className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-headline text-lg font-medium text-primary">
                  {item.label}
                </CardTitle>
                <item.icon className="h-6 w-6 text-accent" />
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-xs text-muted-foreground">
                  Engage with AI for {item.label.toLowerCase()}.
                </p>
              </CardContent>
              <div className="p-4 pt-0 mt-auto">
                 <span className="text-sm font-medium text-primary group-hover:underline flex items-center">
                    Go to {item.label} <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
              </div>
            </Card>
          </a>
        </Link>
      ))}
    </div></>
  );

}