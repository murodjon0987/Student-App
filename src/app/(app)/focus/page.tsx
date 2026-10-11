import type { Metadata } from "next";

import { getFocusData } from "@/features/focus/queries";
import { getSubjects } from "@/features/schedule/queries";
import { FocusView } from "@/features/focus/components/focus-view";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Focus rejim" };

export default async function FocusPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const [data, subjects] = await Promise.all([getFocusData(params), getSubjects()]);

  return (
    <div className="space-y-6"><FocusView
      data={data}
      subjects={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
      }))}
    /><ListPagination meta={data.pagination} path="/focus" params={params} /></div>
  );
}
