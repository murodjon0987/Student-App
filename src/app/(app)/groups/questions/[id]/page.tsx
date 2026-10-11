import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { QuestionView } from "@/features/student-tools/components/question-view";
import { PageLinks } from "@/features/student-tools/components/page-links";
import { queryPage } from "@/lib/pagination";
export const metadata: Metadata = { title: "Fan bo'yicha savol-javob" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { userId } = await verifySession(); const { id } = await params; const query = await searchParams;
  const post = await prisma.groupPost.findFirst({ where: { id, kind: "QUESTION", group: { members: { some: { userId } } } }, include: { group: { select: { name: true, ownerId: true } }, author: { select: { name: true } } } });
  if (!post) notFound();
  const result = await queryPage(query.page, () => prisma.groupReply.count({ where: { postId: post.id } }), (range) => prisma.groupReply.findMany({ where: { postId: post.id }, orderBy: [{ accepted: "desc" }, { createdAt: "asc" }], ...range, include: { author: { select: { name: true } } } }));
  return <div className="space-y-5"><QuestionView userId={userId} ownerId={post.group.ownerId} post={{ id: post.id, title: post.title, content: post.content, subject: post.subject, topic: post.topic, authorId: post.authorId, authorName: post.author.name, groupName: post.group.name }} replies={result.items.map((r) => ({ id: r.id, authorId: r.authorId, authorName: r.author.name, content: r.content, accepted: r.accepted, createdAt: r.createdAt.toISOString() }))} /><PageLinks path={`/groups/questions/${id}`} page={result.pagination.page} total={result.pagination.total} /></div>;
}
