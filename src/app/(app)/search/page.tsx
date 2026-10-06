import type { Metadata } from "next";

import { verifySession } from "@/lib/auth/dal";
import { globalSearch } from "@/features/search/queries";
import { SearchView } from "@/features/search/components/search-view";

export const metadata: Metadata = { title: "Qidiruv" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.q;
  const query = typeof raw === "string" ? raw : "";

  const { userId } = await verifySession();
  const groups = await globalSearch(userId, query);

  return <SearchView query={query} groups={groups} />;
}
