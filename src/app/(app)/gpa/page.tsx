import type { Metadata } from "next";

import { getGrades } from "@/features/gpa/queries";
import { GpaView } from "@/features/gpa/components/gpa-view";

export const metadata: Metadata = { title: "GPA kalkulyator" };

export default async function GpaPage() {
  const grades = await getGrades();

  return <GpaView grades={grades} />;
}
