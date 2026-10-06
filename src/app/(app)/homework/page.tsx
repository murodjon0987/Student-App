import type { Metadata } from "next";

import { getHomework } from "@/features/homework/queries";
import { getSubjects } from "@/features/schedule/queries";
import { HomeworkView } from "@/features/homework/components/homework-view";

export const metadata: Metadata = { title: "Vazifalar" };

export default async function HomeworkPage() {
  const [homework, subjects] = await Promise.all([getHomework(), getSubjects()]);

  return (
    <HomeworkView
      homework={homework}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
