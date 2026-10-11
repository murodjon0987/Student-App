import type { Metadata } from "next";
import { getNotes } from "@/features/notes/queries";
import { getSubjects } from "@/features/schedule/queries";
import { NotesView } from "@/features/notes/components/notes-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Eslatmalar" };

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const [result, subjects] = await Promise.all([getNotes(params), getSubjects()]);
  return (
    <div className="space-y-6">
      <NotesView
        notes={result.items}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        filters={<ListFilters key={JSON.stringify(params)} path="/notes" params={params} fields={[{ name: "tag", label: "Teg (aniq nom)" }]} />}
      />
      <ListPagination meta={result.pagination} path="/notes" params={params} />
    </div>
  );
}
