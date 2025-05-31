
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2, PlusCircle } from "lucide-react";

interface ActivityItem {
  id: string;
  title: string;
  timestamp: string;
  href: string;
}

interface RecentActivityCardProps {
  title: string;
  icon: LucideIcon;
  items: ActivityItem[];
  emptyMessage: string;
  viewAllLink: string;
  isLoading?: boolean;
  emptyActionLink?: string;
  emptyActionText?: string;
}

export function RecentActivityCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
  viewAllLink,
  isLoading = false,
  emptyActionLink,
  emptyActionText,
}: RecentActivityCardProps) {
  return (
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-headline text-xl font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[150px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">{emptyMessage}</p>
            {emptyActionLink && emptyActionText && (
              <Button variant="outline" size="sm" asChild>
                <Link href={emptyActionLink}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {emptyActionText}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[150px]">
            <div className="space-y-3">
              {items.map((item) => (
                <Link href={item.href} key={item.id} className="block p-2 -m-2 rounded-md hover:bg-muted">
                    <div className="font-medium truncate" title={item.title}>{item.title}</div>
                    <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
        {items.length > 0 && !isLoading && (
           <Link href={viewAllLink} className="text-sm text-primary hover:underline mt-3 block text-right">
            View All
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
