import type { Metadata } from "next";

import { ListingForm } from "@/features/housing/components/listing-form";

export const metadata: Metadata = { title: "Yangi e'lon" };

export default function NewHousingPage() {
  return <ListingForm />;
}
