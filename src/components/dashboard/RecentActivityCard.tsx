import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

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
}

export function RecentActivityCard({ title, icon: Icon, items, emptyMessage, viewAllLink }: RecentActivityCardProps) {
  return (
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-headline text-xl font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-4">
              {items.map((item) => (
                <Link href={item.href} key={item.id} className="block p-2 -m-2 rounded-md hover:bg-muted">
                    <div className="font-medium">{item.title}</div>
                    <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
        {items.length > 0 && (
           <Link href={viewAllLink} className="text-sm text-primary hover:underline mt-4 block text-right">
            View All
          </Link>
        )}
      </CardContent>
    </Card>
  );
}