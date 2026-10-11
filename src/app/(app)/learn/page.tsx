import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { LearningView } from "@/features/student-tools/components/learning-view";
import { PageLinks } from "@/features/student-tools/components/page-links";
import { queryPage } from "@/lib/pagination";
export const metadata: Metadata = { title: "Test va kartochkalar" };
export default async function Page({ searchParams }: { searchParams: Promise<{ note?: string; page?: string }> }) {
  const { userId } = await verifySession(); const params = await searchParams;
  const now = new Date();
  const [result, notes, dueCount] = await Promise.all([
    queryPage(params.page, () => prisma.flashcardDeck.count({ where: { userId } }), (range) => prisma.flashcardDeck.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, ...range, include: { cards: { orderBy: { id: "asc" } }, attempts: { orderBy: { createdAt: "desc" }, take: 10 } } })),
    prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true } }),
    prisma.flashcard.count({ where: { deck: { userId }, dueAt: { lte: now } } }),
  ]);
  const initialNote = notes.some((n) => n.id === params.note) ? params.note! : "";
  return <div className="space-y-6"><LearningView now={now.toISOString()} dueCount={dueCount} initialNote={initialNote} notes={notes} decks={result.items.map((d) => ({ id: d.id, title: d.title, subject: d.subject, cards: d.cards.map((c) => ({ id: c.id, question: c.question, answer: c.answer, distractors: c.distractors, dueAt: c.dueAt.toISOString(), repetitions: c.repetitions })), attempts: d.attempts.map((a) => ({ id: a.id, correct: a.correct, total: a.total, createdAt: a.createdAt.toISOString() })) }))} /><PageLinks path="/learn" page={result.pagination.page} total={result.pagination.total} /></div>;
}
