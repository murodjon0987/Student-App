import type { Metadata } from "next";

import { getAnalytics } from "@/features/analytics/queries";
import { AnalyticsView } from "@/features/analytics/components/analytics-view";

export const metadata: Metadata = { title: "Tahlillar" };

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  return <AnalyticsView data={data} />;
}
