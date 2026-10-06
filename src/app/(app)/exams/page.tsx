import type { Metadata } from "next";

import { getExams } from "@/features/exams/queries";
import { getSubjects } from "@/features/schedule/queries";
import { ExamsView } from "@/features/exams/components/exams-view";

export const metadata: Metadata = { title: "Imtihonlar" };

export default async function ExamsPage() {
  const [exams, subjects] = await Promise.all([getExams(), getSubjects()]);

  return (
    <ExamsView
      exams={exams}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
