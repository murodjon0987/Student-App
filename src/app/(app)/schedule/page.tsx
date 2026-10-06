import type { Metadata } from "next";

import { getSchedule, getSubjects } from "@/features/schedule/queries";
import { ScheduleView } from "@/features/schedule/components/schedule-view";

export const metadata: Metadata = { title: "Dars jadvali" };

export default async function SchedulePage() {
  const [schedule, subjects] = await Promise.all([
    getSchedule(),
    getSubjects(),
  ]);

  return (
    <ScheduleView
      schedule={schedule}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
