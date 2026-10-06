import type { Metadata } from "next";

import { getFocusData } from "@/features/focus/queries";
import { getSubjects } from "@/features/schedule/queries";
import { FocusView } from "@/features/focus/components/focus-view";

export const metadata: Metadata = { title: "Focus rejim" };

export default async function FocusPage() {
  const [data, subjects] = await Promise.all([getFocusData(), getSubjects()]);

  return (
    <FocusView
      data={data}
      subjects={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
      }))}
    />
  );
}
