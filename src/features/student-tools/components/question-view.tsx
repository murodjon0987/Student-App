"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { replyToQuestion, acceptQuestionReply, deleteQuestionReply } from "@/features/groups/actions";
import { Field, field, panel, useToolAction } from "./shared";
import { academicTimestamp } from "../algorithms";
export function QuestionView({ post, replies, userId, ownerId }: { post: { id: string; title: string; content: string; subject: string; topic: string; authorId: string; authorName: string; groupName: string }; replies: { id: string; authorId: string; authorName: string; content: string; accepted: boolean; createdAt: string }[]; userId: string; ownerId: string }) {
  const { pending, run } = useToolAction();
  return <div className="space-y-5"><Link href="/groups" className="text-sm text-primary hover:underline">← Guruhlar</Link><PageHeader title={post.title} description={`${post.groupName} · ${[post.subject, post.topic].filter(Boolean).join(" · ")}`} />
    <article className={panel}><p className="whitespace-pre-wrap break-words">{post.content}</p><p className="text-xs text-muted-foreground">Savol muallifi: {post.authorName}</p></article>
    <form className={panel} onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const content = new FormData(form).get("content"); run(() => replyToQuestion({ postId: post.id, content }), "Javob joylandi", () => form.reset()); }}><Field label="Javobingiz"><textarea className={field} rows={4} name="content" required maxLength={5000} placeholder="Yechimni izohlang, kursdoshingizga tushunishga yordam bering..." /></Field><Button type="submit" disabled={pending}>{pending ? "Saqlanmoqda..." : "Javob berish"}</Button></form>
    {!replies.length && <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Hozircha javob yo'q. Birinchi bo'lib yordam bering.</p>}
    {replies.map((reply) => <article key={reply.id} className={`${panel} ${reply.accepted ? "border-emerald-500 bg-emerald-500/5" : ""}`}><div className="flex justify-between gap-3"><p className="text-sm font-medium">{reply.authorName}</p>{reply.accepted && <span className="text-sm font-semibold text-emerald-600">✓ Foydali javob</span>}</div><p className="whitespace-pre-wrap break-words text-sm">{reply.content}</p><p className="text-xs text-muted-foreground">{academicTimestamp(reply.createdAt)}</p><div className="flex gap-2">{(post.authorId === userId || ownerId === userId) && <Button variant="outline" disabled={pending} onClick={() => run(() => acceptQuestionReply({ id: reply.id, accepted: !reply.accepted }), "Javob holati yangilandi")}>{reply.accepted ? "Belgini olib tashlash" : "Foydali javob deb belgilash"}</Button>}{(reply.authorId === userId || ownerId === userId) && <Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm("Javob o'chirilsinmi?")) run(() => deleteQuestionReply(reply.id), "Javob o'chirildi"); }}>O'chirish</Button>}</div></article>)}
  </div>;
}
