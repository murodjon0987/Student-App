import type { Metadata } from "next";
import { getGoals } from "@/features/goals/queries";
import { GoalsView } from "@/features/goals/components/goals-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";

export const metadata: Metadata = { title: "Maqsadlar" };

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const result = await getGoals(params);
  return (
    <div className="space-y-6">
      <GoalsView
        goals={result.items}
        filters={<ListFilters key={JSON.stringify(params)} path="/goals" params={params} />}
      />
      <ListPagination meta={result.pagination} path="/goals" params={params} />
    </div>
  );
}
