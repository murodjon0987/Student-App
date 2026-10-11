"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteNotification,
  markAllRead,
  markRead,
} from "@/features/notifications/actions";
import type { NotificationItem } from "@/features/notifications/queries";

interface Props {
  notifications: NotificationItem[];
  filters: React.ReactNode;
  unreadCount: number;
}

const TYPE_CONFIG: Record<
  string,
  { icon: LucideIcon; label: string; className: string }
> = {
  INFO: {
    icon: Info,
    label: "Ma'lumot",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  REMINDER: {
    icon: Bell,
    label: "Eslatma",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  WARNING: {
    icon: AlertTriangle,
    label: "Ogohlantirish",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  SUCCESS: {
    icon: CheckCircle2,
    label: "Muvaffaqiyat",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

export function NotificationsView({ notifications, filters, unreadCount }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  async function handleMarkRead(id: string) {
    setPendingId(id);
    const result = await markRead(id);
    setPendingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    const result = await markAllRead();
    setMarkingAll(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Barchasi o'qilgan deb belgilandi");
    router.refresh();
  }

  function renderItem(item: NotificationItem) {
    const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.INFO;
    const Icon = config.icon;

    return (
      <div
        key={item.id}
        className={cn(
          "group flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
          item.read
            ? "border-border bg-card"
            : "border-primary/30 bg-primary/5"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
            config.className
          )}
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.link ? (
              <Link
                href={item.link}
                className="font-medium hover:underline"
                onClick={() => {
                  if (!item.read) void markRead(item.id);
                }}
              >
                {item.title}
              </Link>
            ) : (
              <p className="font-medium">{item.title}</p>
            )}
            {!item.read && (
              <span className="size-2 shrink-0 rounded-full bg-primary" />
            )}
            <span className="text-[11px] text-muted-foreground">
              {config.label}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{timeAgo(item.createdAt)}</span>
            {item.link && (
              <Link
                href={item.link}
                className="text-primary hover:underline"
              >
                Batafsil
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!item.read && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pendingId === item.id}
              onClick={() => handleMarkRead(item.id)}
              aria-label="O'qilgan deb belgilash"
            >
              <CheckCheck className="size-4" />
            </Button>
          )}
          <ConfirmDialog
            title="Bildirishnomani o'chirish"
            description={`"${item.title}" o'chiriladi.`}
            onConfirm={async () => {
              const result = await deleteNotification(item.id);
              if (!result.success) toast.error(result.error);
              else {
                toast.success("O'chirildi");
                router.refresh();
              }
            }}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="O'chirish"
                className="opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bildirishnomalar"
        description="Muhim xabarlar va eslatmalar."
      >
        <Button
          variant="outline"
          onClick={handleMarkAll}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck className="size-4" /> Barchasini o'qilgan deb belgilash
        </Button>
      </PageHeader>

      {filters}

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Bildirishnomalar yo'q"
          description="Hozircha yangi xabarlar mavjud emas."
        />
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">
                Bu sahifada o'qilmagan ({unread.length})
              </h2>
              {unread.map(renderItem)}
            </section>
          )}

          {read.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Bu sahifada o'qilgan ({read.length})
              </h2>
              {read.map(renderItem)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
