import type { Metadata } from "next";

import { getNotifications } from "@/features/notifications/queries";
import { NotificationsView } from "@/features/notifications/components/notifications-view";

export const metadata: Metadata = { title: "Bildirishnomalar" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return <NotificationsView notifications={notifications} />;
}
