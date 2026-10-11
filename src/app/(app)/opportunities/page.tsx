import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { OpportunitiesView } from "@/features/student-tools/components/opportunities-view";
import { opportunityKinds } from "@/features/student-tools/schema";
import { PageLinks } from "@/features/student-tools/components/page-links";
import { queryPage } from "@/lib/pagination";
export const metadata: Metadata = { title: "Talabalar uchun imkoniyatlar" };
const fieldClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { userId } = await verifySession(); const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 160) : ""])) as Record<string, string>;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, profile: { select: { course: true } } } });
  const course = params.course === "all" ? 0 : Number(params.course || user?.profile?.course || 0);
  const where: Prisma.OpportunityWhereInput = {
    ...(params.expired !== "1" ? { deadline: { gte: new Date() } } : {}),
    ...(params.kind && params.kind in opportunityKinds ? { kind: params.kind } : {}),
    ...(Number.isInteger(course) && course >= 1 && course <= 6 ? { minCourse: { lte: course }, maxCourse: { gte: course } } : {}),
    ...(params.field ? { field: { contains: params.field, mode: "insensitive" } } : {}),
    ...(params.language ? { language: { contains: params.language, mode: "insensitive" } } : {}),
    ...(params.q ? { OR: [{ title: { contains: params.q, mode: "insensitive" } }, { organization: { contains: params.q, mode: "insensitive" } }] } : {}),
    ...(params.saved === "1" ? { saves: { some: { userId } } } : {}),
    ...(params.verified === "1" ? { verified: true } : {}),
  };
  const result = await queryPage(params.page, () => prisma.opportunity.count({ where }), (range) => prisma.opportunity.findMany({ where, orderBy: [{ verified: "desc" }, { deadline: "asc" }], ...range, include: { saves: { where: { userId }, select: { userId: true } } } }));
  const filters = <form action="/opportunities" className="space-y-3 rounded-xl border bg-card p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="text-sm">Qidiruv<input name="q" className={fieldClass} defaultValue={params.q} placeholder="Nomi yoki tashkilot" /></label><label className="text-sm">Turi<select name="kind" className={fieldClass} defaultValue={params.kind}><option value="">Barchasi</option>{Object.entries(opportunityKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm">Kurs<select name="course" className={fieldClass} defaultValue={course ? String(course) : "all"}><option value="all">Barcha kurslar</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}-kurs</option>)}</select></label><label className="text-sm">Yo'nalish<input className={fieldClass} name="field" defaultValue={params.field} placeholder="Masalan, IT" /></label><label className="text-sm">Til darajasi<input className={fieldClass} name="language" defaultValue={params.language} placeholder="Masalan, B2" /></label></div><div className="flex flex-wrap items-center gap-4 text-sm"><label><input type="checkbox" name="saved" value="1" defaultChecked={params.saved === "1"} /> Saqlanganlar</label><label><input type="checkbox" name="verified" value="1" defaultChecked={params.verified === "1"} /> Tasdiqlanganlar</label><label><input type="checkbox" name="expired" value="1" defaultChecked={params.expired === "1"} /> Muddati tugaganlarni ham ko'rsatish</label><button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" type="submit">Filtrlash</button><a href="/opportunities?course=all" className="text-primary">Tozalash</a></div></form>;
  return <div className="space-y-6"><OpportunitiesView items={result.items.map((o) => ({ id: o.id, userId: o.userId, title: o.title, organization: o.organization, kind: o.kind, field: o.field, minCourse: o.minCourse, maxCourse: o.maxCourse, language: o.language, requirements: o.requirements, url: o.url, deadline: o.deadline.toISOString(), verified: o.verified, updatedAt: o.updatedAt.toISOString(), saved: o.saves.length > 0 }))} userId={userId} isAdmin={user?.role === "ADMIN"} filters={filters} /><PageLinks path="/opportunities" page={result.pagination.page} total={result.pagination.total} params={params} /></div>;
}
