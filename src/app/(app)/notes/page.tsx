import type { Metadata } from "next";

import { getNotes } from "@/features/notes/queries";
import { getSubjects } from "@/features/schedule/queries";
import { NotesView } from "@/features/notes/components/notes-view";

export const metadata: Metadata = { title: "Eslatmalar" };

export default async function NotesPage() {
  const [notes, subjects] = await Promise.all([getNotes(), getSubjects()]);

  return (
    <NotesView
      notes={notes}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
