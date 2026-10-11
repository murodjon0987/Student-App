"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Copy, ExternalLink, Trash2, MessageCircle, BookOpen, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { createGroup, joinGroup, publishGroupPost, deleteGroupPost } from "../actions";
import type { ActionResult } from "@/lib/types";
import { academicTimestamp } from "@/features/student-tools/algorithms";

interface Post {
  id: string; authorId: string; authorName: string; kind: string;
  title: string; content: string; url: string | null; createdAt: string;
  subject: string; topic: string; replyCount: number; solved: boolean;
}
interface Group {
  id: string; name: string; university: string; ownerId: string;
  inviteCode: string; memberCount: number; posts: Post[];
}
const kinds = [
  { value: "ANNOUNCEMENT", label: "E'lon", icon: Megaphone },
  { value: "MATERIAL", label: "Material", icon: BookOpen },
  { value: "QUESTION", label: "Savol", icon: MessageCircle },
];
const fieldClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function GroupsView({ groups, userId }: { groups: Group[]; userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(groups[0]?.id ?? "");
  const [filter, setFilter] = useState("ALL");
  const group = groups.find((item) => item.id === selected) ?? groups[0];

  function run(action: () => Promise<ActionResult>, message: string, form?: HTMLFormElement) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) { toast.error(result.error); return; }
        toast.success(message);
        form?.reset();
        router.refresh();
      } catch { toast.error("Xatolik yuz berdi. Qayta urinib ko'ring."); }
    });
  }

  return <div className="space-y-6">
    <PageHeader title="Guruhim" description="Kursdoshlaringiz bilan e'lonlar, materiallar va savollarni ulashing." />
    <div className="grid gap-4 md:grid-cols-2">
      <form className="space-y-3 rounded-xl border bg-card p-5" onSubmit={(event) => {
        event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
        run(() => createGroup({ name: data.get("name"), university: data.get("university") }), "Guruh yaratildi", form);
      }}>
        <h2 className="font-semibold">Yangi guruh yaratish</h2>
        <div className="space-y-1"><Label htmlFor="group-name">Guruh nomi</Label><Input id="group-name" name="name" placeholder="Masalan: Dasturiy injiniring 21-04" required minLength={2} maxLength={80} /></div>
        <div className="space-y-1"><Label htmlFor="group-university">Universitet</Label><Input id="group-university" name="university" placeholder="Universitetingiz nomi" required minLength={2} maxLength={160} /></div>
        <Button disabled={pending} type="submit">Guruh yaratish</Button>
      </form>
      <form className="space-y-3 rounded-xl border bg-card p-5" onSubmit={(event) => {
        event.preventDefault(); const form = event.currentTarget;
        run(() => joinGroup(new FormData(form).get("code")), "Guruhga qo'shildingiz", form);
      }}>
        <h2 className="font-semibold">Kursdoshlarga qo'shilish</h2>
        <p className="text-sm text-muted-foreground">Guruh a'zosidan taklif kodini olib, shu yerga kiriting.</p>
        <div className="space-y-1"><Label htmlFor="invite-code">Taklif kodi</Label><Input id="invite-code" name="code" placeholder="16 belgili kod" className="font-mono uppercase" required minLength={16} maxLength={16} /></div>
        <Button disabled={pending} variant="outline" type="submit">Guruhga qo'shilish</Button>
      </form>
    </div>
    {!group ? <div className="rounded-xl border border-dashed p-10 text-center">
      <Users className="mx-auto mb-3 size-10 text-muted-foreground" />
      <h2 className="font-semibold">Kursdoshlaringizni bir joyga to'plang</h2>
      <p className="mt-2 text-sm text-muted-foreground">Guruh yarating va taklif kodini ulashing. Birinchi e'lon yoki konspektni siz joylang!</p>
    </div> : <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Guruhlar">{groups.map((item) => <Button key={item.id} variant={group.id === item.id ? "default" : "outline"} onClick={() => { setSelected(item.id); setFilter("ALL"); }}>{item.name}</Button>)}</div>
      <div className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div><h2 className="text-lg font-semibold">{group.name}</h2><p className="text-sm text-muted-foreground">{group.university} · {group.memberCount} a'zo</p></div>
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(group.inviteCode); toast.success("Taklif kodi nusxalandi"); }
          catch { toast.error("Nusxalab bo'lmadi. Kodni belgilab nusxalang."); }
        }}><Copy className="size-4" /><span className="select-text font-mono">{group.inviteCode}</span></Button>
      </div>
      <form key={group.id} className="space-y-3 rounded-xl border bg-card p-5" onSubmit={(event) => {
        event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
        run(() => publishGroupPost({ groupId: group.id, kind: data.get("kind"), title: data.get("title"), content: data.get("content"), url: data.get("url"), subject: data.get("subject"), topic: data.get("topic") }), "Post joylandi", form);
      }}>
        <h3 className="font-semibold">Guruhga ulashish</h3>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="space-y-1"><Label htmlFor="post-kind">Post turi</Label><select id="post-kind" name="kind" className={fieldClass}>{kinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor="post-title">Sarlavha</Label><Input id="post-title" name="title" required minLength={2} maxLength={160} placeholder="Masalan: Ertangi dars uchun konspekt" /></div>
        </div>
        <div className="space-y-1"><Label htmlFor="post-content">Matn</Label><textarea id="post-content" name="content" className={fieldClass} rows={3} required maxLength={5000} placeholder="E'lon, material haqida ma'lumot yoki savolingiz..." /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="post-subject">Fan (ixtiyoriy)</Label><Input id="post-subject" name="subject" maxLength={100} placeholder="Matematika" /></div><div className="space-y-1"><Label htmlFor="post-topic">Mavzu (ixtiyoriy)</Label><Input id="post-topic" name="topic" maxLength={100} placeholder="Integrallar" /></div></div>
        <div className="space-y-1"><Label htmlFor="post-url">Material havolasi (ixtiyoriy)</Label><Input id="post-url" name="url" type="url" maxLength={2000} placeholder="https://..." /></div>
        <Button disabled={pending} type="submit">{pending ? "Saqlanmoqda..." : "Joylash"}</Button>
      </form>
      <div className="flex flex-wrap gap-2" aria-label="Post turlari">
        <Button variant={filter === "ALL" ? "default" : "outline"} onClick={() => setFilter("ALL")}>Barchasi</Button>
        {kinds.map((kind) => <Button key={kind.value} variant={filter === kind.value ? "default" : "outline"} onClick={() => setFilter(kind.value)}><kind.icon className="size-4" />{kind.label}</Button>)}
      </div>
      <p className="text-xs text-muted-foreground">Guruhning oxirgi 50 ta posti ko'rsatiladi.</p>
      {group.posts.filter((post) => filter === "ALL" || post.kind === filter).length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Hozircha post yo'q. Birinchi bo'lib ulashing!</p>}
      <div className="space-y-3">{group.posts.filter((post) => filter === "ALL" || post.kind === filter).map((post) => <article key={post.id} className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-primary">{kinds.find((kind) => kind.value === post.kind)?.label}</p><h3 className="break-words font-semibold">{post.title}</h3></div>
          {(post.authorId === userId || group.ownerId === userId) && <Button variant="ghost" size="icon" disabled={pending} aria-label="Postni o'chirish" onClick={() => {
            if (window.confirm("Postni o'chirmoqchimisiz?")) run(() => deleteGroupPost(post.id), "Post o'chirildi");
          }}><Trash2 className="size-4" /></Button>}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm">{post.content}</p>
        {(post.subject || post.topic) && <p className="text-xs text-muted-foreground">{[post.subject, post.topic].filter(Boolean).join(" · ")}</p>}
        {post.kind === "QUESTION" && <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href={`/groups/questions/${post.id}`}><MessageCircle className="size-4" />{post.replyCount} ta javob · {post.solved ? "Yechim belgilangan ✓" : "Savolga javob berish"}</Link>}
        {post.url && <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="size-4" />Materialni ochish</a>}
        <p className="text-xs text-muted-foreground">{post.authorName} · {academicTimestamp(post.createdAt)}</p>
      </article>)}</div>
    </div>}
  </div>;
}
