import type { Metadata } from "next";

import { getAttendance } from "@/features/attendance/queries";
import { getSchedule, getSubjects } from "@/features/schedule/queries";
import { AttendanceView } from "@/features/attendance/components/attendance-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Davomat" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const params = await searchParams;
  const [result, subjects, schedules] = await Promise.all([
    getAttendance(params),
    getSubjects(),
    getSchedule(),
  ]);

  return (
    <div className="space-y-6">
      <AttendanceView
        records={result.items}
        summary={result.summary}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        schedules={schedules.map((s) => ({
          id: s.id,
          title: s.title,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          subjectId: s.subjectId,
        }))}
        filters={
          <ListFilters
            key={JSON.stringify(params)}
            path="/attendance"
            params={params}
            searchLabel="Fan nomi"
            fields={[
              {
                name: "status",
                label: "Holat",
                options: [
                  { value: "", label: "Barchasi" },
                  ...ATTENDANCE_STATUSES.map((s) => ({
                    value: s,
                    label: ATTENDANCE_LABELS[s],
                  })),
                ],
              },
              {
                name: "subject",
                label: "Fan",
                options: [
                  { value: "", label: "Barchasi" },
                  ...subjects.map((s) => ({ value: s.id, label: s.name })),
                ],
              },
            ]}
          />
        }
      />
      <ListPagination meta={result.pagination} path="/attendance" params={params} />
    </div>
  );
}
