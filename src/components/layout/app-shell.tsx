"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-logo";
import { NAV_SECTIONS, MOBILE_NAV } from "@/components/layout/nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { NotificationPrompt } from "@/components/pwa/notification-prompt";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { initials } from "@/lib/utils";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  university?: string | null;
  group?: string | null;
  unreadCount: number;
}

function Logo({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <BrandMark className="size-9 shrink-0 rounded-xl shadow-sm" />
      <span className={cn("text-sm font-bold", compact && "hidden sm:inline")}>
        Student App
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user }: { user: AppUser }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Avatar className="size-9">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user.group ?? user.email}
        </p>
      </div>
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Asosiy bo'limlar" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-[10px] font-medium leading-tight transition-colors sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/50 px-4 py-5 lg:flex">
        <Logo />
        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <NavLinks />
        </div>
        <UserCard user={user} />
      </aside>

      {/* Mobile drawer */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="left-0 top-0 flex h-dvh max-h-dvh w-[85vw] max-w-80 translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-l-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:p-4">
            <DialogTitle className="sr-only">Asosiy menyu</DialogTitle>
            <DialogDescription className="sr-only">Student App bo'limlarini tanlang.</DialogDescription>
            <div className="shrink-0 pr-10">
              <Logo />
            </div>
            <div className="my-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <UserCard user={user} />
          </DialogContent>
      </Dialog>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-border bg-background/80 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-[env(safe-area-inset-top,0px)] backdrop-blur-md sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0 lg:hidden">
            <Logo compact />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell count={user.unreadCount} />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="app-content mx-auto min-w-0 w-full max-w-7xl px-[max(0.75rem,env(safe-area-inset-left,0px))] py-4 pr-[max(0.75rem,env(safe-area-inset-right,0px))] pb-[calc(5.5rem_+_env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 sm:pb-[calc(5.5rem_+_env(safe-area-inset-bottom,0px))] lg:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
      <NotificationPrompt />
    </div>
  );
}
