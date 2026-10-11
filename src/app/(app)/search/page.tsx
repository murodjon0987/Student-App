import type { Metadata } from "next";

import { verifySession } from "@/lib/auth/dal";
import { globalSearch } from "@/features/search/queries";
import { SearchView } from "@/features/search/components/search-view";
import { param } from "@/lib/pagination";

export const metadata: Metadata = { title: "Qidiruv" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = param(params, "q");

  const { userId } = await verifySession();
  const { groups, pages } = await globalSearch(userId, query, params);

  return <SearchView query={query} groups={groups} pages={pages} />;
}
