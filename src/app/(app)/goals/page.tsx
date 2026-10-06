import type { Metadata } from "next";

import { getGoals } from "@/features/goals/queries";
import { GoalsView } from "@/features/goals/components/goals-view";

export const metadata: Metadata = { title: "Maqsadlar" };

export default async function GoalsPage() {
  const goals = await getGoals();

  return <GoalsView goals={goals} />;
}
