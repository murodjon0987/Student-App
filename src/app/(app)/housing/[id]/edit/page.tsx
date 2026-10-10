import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getListing } from "@/features/housing/queries";
import { ListingForm } from "@/features/housing/components/listing-form";

export const metadata: Metadata = { title: "E'lonni tahrirlash" };

export default async function EditHousingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();
  if (!listing.isMine) redirect(`/housing/${id}`);

  return <ListingForm initial={listing} />;
}
