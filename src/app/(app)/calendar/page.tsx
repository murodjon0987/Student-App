import type { Metadata } from "next";

import { getCalendarData } from "@/features/calendar/queries";
import { CalendarView } from "@/features/calendar/components/calendar-view";

export const metadata: Metadata = { title: "Kalendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.month;
  const month = typeof raw === "string" ? raw : undefined;

  const data = await getCalendarData(month);

  return <CalendarView data={data} />;
}
