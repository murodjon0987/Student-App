import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPushSubscription } from "@/features/notifications/push";
import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata: Metadata = { title: "Sozlamalar" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const pushEnabled = await hasPushSubscription(user.id);

  return (
    <SettingsView
      email={user.email}
      profile={{
        language: user.profile?.language ?? "uz",
        theme: user.profile?.theme ?? "system",
        notificationsEnabled: user.profile?.notificationsEnabled ?? true,
        monthlyBudget: user.profile?.monthlyBudget ?? 0,
      }}
      pushEnabled={pushEnabled}
    />
  );
}
