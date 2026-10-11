import type { Metadata } from "next";

import { getBudgetData } from "@/features/budget/queries";
import { BudgetView } from "@/features/budget/components/budget-view";
import { ListPagination } from "@/components/shared/list-pagination";

export const metadata: Metadata = { title: "Budjet" };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.month;
  const month = typeof raw === "string" ? raw : undefined;

  const data = await getBudgetData(month, params);

  return <div className="space-y-6"><BudgetView data={data} /><ListPagination meta={data.pagination} path="/budget" params={{ ...params, month: data.month }} /></div>;
}
