import type { Metadata } from "next";
import { getNotifications } from "@/features/notifications/queries";
import { NotificationsView } from "@/features/notifications/components/notifications-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Bildirishnomalar" };

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const result = await getNotifications(params);
  return (
    <div className="space-y-6">
      <NotificationsView
        notifications={result.items}
        unreadCount={result.unreadCount}
        filters={<ListFilters key={JSON.stringify(params)} path="/notifications" params={params} fields={[{ name: "read", label: "Holat", options: [{ value: "", label: "Barchasi" }, { value: "unread", label: "O'qilmagan" }, { value: "read", label: "O'qilgan" }] }]} />}
      />
      <ListPagination meta={result.pagination} path="/notifications" params={params} />
    </div>
  );
}
