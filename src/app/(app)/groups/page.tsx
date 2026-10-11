import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { GroupsView } from "@/features/groups/components/groups-view";

export const metadata: Metadata = { title: "Guruhim" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { userId } = await verifySession();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 160) : "";
  const contains = { contains: q.trim().slice(0, 160), mode: "insensitive" as const };
  const groups = await prisma.studentGroup.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      posts: { where: q.trim() ? { OR: [{ title: contains }, { content: contains }, { subject: contains }, { topic: contains }] } : {}, orderBy: { createdAt: "desc" }, take: 50, include: { author: { select: { name: true } }, _count: { select: { replies: true } }, replies: { where: { accepted: true }, take: 1, select: { id: true } } } },
    },
  });
  return <div className="space-y-5"><form action="/groups" className="flex gap-2"><input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" aria-label="Fan, mavzu yoki savolni qidirish" name="q" defaultValue={q} maxLength={160} placeholder="Fan, mavzu yoki savolni barcha guruhlaringizdan qidiring" /><button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Qidirish</button></form><GroupsView userId={userId} groups={groups.map((group) => ({
    id: group.id, name: group.name, university: group.university, ownerId: group.ownerId,
    inviteCode: group.inviteCode, memberCount: group._count.members,
    posts: group.posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString(), authorName: post.author.name, replyCount: post._count.replies, solved: post.replies.length > 0 })),
  }))} /></div>;
}
