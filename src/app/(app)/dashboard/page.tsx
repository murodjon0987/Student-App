import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth/dal";
import { getDashboardData } from "@/features/dashboard/queries";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = { title: "Bosh sahifa" };

export default async function DashboardPage() {
  const [user, data] = await Promise.all([
    getCurrentUser(),
    getDashboardData(),
  ]);

  return <DashboardView name={user.name} data={data} />;
}
