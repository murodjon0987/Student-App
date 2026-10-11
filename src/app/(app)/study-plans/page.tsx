import type { Metadata } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { PlansView } from "@/features/student-tools/components/plans-view";
import { topicSchema } from "@/features/student-tools/schema";
import { academicDate, localDateKey } from "@/features/student-tools/algorithms";
import { PageLinks } from "@/features/student-tools/components/page-links";
import { queryPage } from "@/lib/pagination";
export const metadata: Metadata = { title: "Imtihonga tayyorgarlik" };
export default async function Page({ searchParams }: { searchParams: Promise<{ exam?: string; page?: string }> }) {
  const { userId } = await verifySession(); const params = await searchParams;
  const today = localDateKey();
  const [result, exams] = await Promise.all([
    queryPage(params.page, () => prisma.studyPlan.count({ where: { userId } }), (range) => prisma.studyPlan.findMany({ where: { userId }, include: { exam: true, tasks: { orderBy: [{ date: "asc" }, { id: "asc" }] } }, orderBy: { createdAt: "desc" }, ...range })),
    prisma.exam.findMany({ where: { userId, date: { gte: new Date(academicDate(today).getTime() + 86_400_000) } }, orderBy: { date: "asc" }, take: 100, select: { id: true, title: true, date: true } }),
  ]);
  return <div className="space-y-6"><PlansView today={today} initialExam={exams.some((e) => e.id === params.exam) ? params.exam! : ""} exams={exams.map((e) => ({ ...e, date: e.date.toISOString() }))} plans={result.items.map((p) => ({ id: p.id, examId: p.examId, title: p.exam.title, date: p.exam.date.toISOString(), dailyMinutes: p.dailyMinutes, totalMinutes: z.array(topicSchema).parse(p.topics).reduce((s, t) => s + t.minutes, 0), tasks: p.tasks.map((t) => ({ id: t.id, topic: t.topic, minutes: t.minutes, done: t.done, date: t.date.toISOString() })) }))} /><PageLinks path="/study-plans" page={result.pagination.page} total={result.pagination.total} /></div>;
}
