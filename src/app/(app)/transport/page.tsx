import type { Metadata } from "next";

import { getTransitData } from "@/features/transport/queries";
import { TransportView } from "@/features/transport/components/transport-view";

export const metadata: Metadata = { title: "Transport" };

export default async function TransportPage() {
  const { stops, lines, fares } = await getTransitData();

  return <TransportView stops={stops} lines={lines} fares={fares} />;
}
