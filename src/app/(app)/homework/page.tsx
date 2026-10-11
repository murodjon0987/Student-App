import type { Metadata } from "next";
import { getHomework } from "@/features/homework/queries";
import { getSubjects } from "@/features/schedule/queries";
import { HomeworkView } from "@/features/homework/components/homework-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Vazifalar" };

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const [result, subjects] = await Promise.all([getHomework(params), getSubjects()]);
  return (
    <div className="space-y-6">
      <HomeworkView
        homework={result.items}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        filters={<ListFilters key={JSON.stringify(params)} path="/homework" params={params} fields={[
  { name: "status", label: "Holat", options: [{ value: "", label: "Barchasi" }, { value: "PENDING", label: "Kutilmoqda" }, { value: "IN_PROGRESS", label: "Jarayonda" }, { value: "COMPLETED", label: "Bajarildi" }] },
  { name: "priority", label: "Muhimlik", options: [{ value: "", label: "Barchasi" }, { value: "HIGH", label: "Yuqori" }, { value: "MEDIUM", label: "O'rta" }, { value: "LOW", label: "Past" }] },
  { name: "sort", label: "Saralash", defaultValue: "deadline", options: [{ value: "deadline", label: "Deadline" }, { value: "priority", label: "Muhimlik" }, { value: "created", label: "Yangi" }] },
]} />}
      />
      <ListPagination meta={result.pagination} path="/homework" params={params} />
    </div>
  );
}
