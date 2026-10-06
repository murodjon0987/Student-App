"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/notifications" aria-label="Bildirishnomalar" className="relative">
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
