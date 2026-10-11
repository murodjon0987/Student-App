import type { Metadata } from "next";

import { getGrades } from "@/features/gpa/queries";
import { GpaView } from "@/features/gpa/components/gpa-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "GPA kalkulyator" };

export default async function GpaPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const result = await getGrades(params);

  return (
    <div className="space-y-6">
      <GpaView
        grades={result.items}
        summary={result.summary}
        semesters={result.semesters}
        activeSemester={result.activeSemester}
        filters={
          <ListFilters
            key={JSON.stringify(params)}
            path="/gpa"
            params={params}
            searchLabel="Fan nomi"
            fields={[
              {
                name: "semester",
                label: "Semestr",
                options: [
                  { value: "", label: "Barchasi" },
                  ...result.semesters.map((semester) => ({
                    value: semester.id,
                    label: semester.name,
                  })),
                ],
              },
            ]}
          />
        }
      />
      <ListPagination meta={result.pagination} path="/gpa" params={params} />
    </div>
  );
}
