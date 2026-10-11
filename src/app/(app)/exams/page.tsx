import type { Metadata } from "next";
import { getExams } from "@/features/exams/queries";
import { ExamsView } from "@/features/exams/components/exams-view";
import { getSubjects } from "@/features/schedule/queries";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Imtihonlar" };

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const [result, subjects] = await Promise.all([getExams(params), getSubjects()]);
  return (
    <div className="space-y-6">
      <ExamsView
        exams={result.items}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        filters={<ListFilters key={JSON.stringify(params)} path="/exams" params={params} />}
      />
      <ListPagination meta={result.pagination} path="/exams" params={params} />
    </div>
  );
}
