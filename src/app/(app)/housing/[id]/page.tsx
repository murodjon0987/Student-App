import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getListing, incrementListingViews } from "@/features/housing/queries";
import { ListingDetail } from "@/features/housing/components/listing-detail";

export const metadata: Metadata = { title: "E'lon" };

export default async function HousingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();

  void incrementListingViews(id);

  return <ListingDetail listing={listing} />;
}
