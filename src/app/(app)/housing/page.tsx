import type { Metadata } from "next";

import { getListings } from "@/features/housing/queries";
import { HousingView } from "@/features/housing/components/housing-view";

export const metadata: Metadata = { title: "Kvartiralar" };

export default async function HousingPage() {
  const listings = await getListings();

  return <HousingView listings={listings} />;
}
