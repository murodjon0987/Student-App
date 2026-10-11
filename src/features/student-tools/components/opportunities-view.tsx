"use client";
import { useState } from "react";
import { Bookmark, ExternalLink, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { saveOpportunity, bookmarkOpportunity, verifyOpportunity, deleteOpportunity } from "../opportunity-actions";
import { Field, field, panel, useToolAction } from "./shared";
import { localDateKey } from "../algorithms";
import { opportunityKinds } from "../schema";

export interface OpportunityItem {
  id: string; userId: string; title: string; organization: string; kind: string; field: string;
  minCourse: number; maxCourse: number; language: string; requirements: string; url: string;
  deadline: string; verified: boolean; saved: boolean; updatedAt: string;
}
function OpportunityEditor({ opportunity, close }: { opportunity?: OpportunityItem; close: () => void }) {
  const { pending, run } = useToolAction();
  return <form className={panel} onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); run(() => saveOpportunity({ ...data, id: opportunity?.id, minCourse: Number(data.minCourse), maxCourse: Number(data.maxCourse) }), "E'lon saqlandi. Manba tekshirilmaguncha tasdiqlanmagan holatda turadi.", close); }}>
    <div className="flex justify-between"><h2 className="font-semibold">{opportunity ? "E'lonni tahrirlash" : "Imkoniyat ulashish"}</h2><Button type="button" variant="ghost" disabled={pending} onClick={close}>Yopish</Button></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Sarlavha"><input className={field} name="title" required minLength={3} maxLength={160} defaultValue={opportunity?.title} /></Field><Field label="Tashkilot"><input className={field} name="organization" required minLength={2} maxLength={160} defaultValue={opportunity?.organization} /></Field>
      <Field label="Turi"><select className={field} name="kind" defaultValue={opportunity?.kind ?? "INTERNSHIP"}>{Object.entries(opportunityKinds).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></Field><Field label="Yo'nalish"><input className={field} name="field" required maxLength={100} defaultValue={opportunity?.field} placeholder="IT, tibbiyot, barcha yo'nalishlar..." /></Field>
      <Field label="Eng kichik kurs"><input className={field} name="minCourse" type="number" required min={1} max={6} defaultValue={opportunity?.minCourse ?? 1} /></Field><Field label="Eng katta kurs"><input className={field} name="maxCourse" type="number" required min={1} max={6} defaultValue={opportunity?.maxCourse ?? 6} /></Field><Field label="Til va daraja"><input className={field} name="language" required maxLength={100} defaultValue={opportunity?.language} placeholder="Ingliz tili B2 yoki til talabi yo'q" /></Field><Field label="Ariza muddati"><input className={field} name="deadline" type="date" required defaultValue={opportunity ? localDateKey(new Date(opportunity.deadline)) : ""} /></Field>
    </div><Field label="Rasmiy manba havolasi"><input className={field} type="url" name="url" required maxLength={2000} defaultValue={opportunity?.url} placeholder="https://..." /></Field><Field label="Talablar va ariza topshirish tartibi"><textarea className={field} name="requirements" required minLength={10} maxLength={5000} rows={5} defaultValue={opportunity?.requirements} /></Field>
    <p className="text-sm text-muted-foreground">E'lon jamoaga ko'rinadi. Administrator manbani tekshirib tasdiqlaydi; tahrirlansa qayta tekshiriladi.</p><Button disabled={pending} type="submit">{pending ? "Saqlanmoqda..." : "Saqlash"}</Button>
  </form>;
}
export function OpportunitiesView({ items, userId, isAdmin, filters }: { items: OpportunityItem[]; userId: string; isAdmin: boolean; filters: React.ReactNode }) {
  const { pending, run } = useToolAction();
  const [editing, setEditing] = useState<string | null>(null);
  return <div className="space-y-6"><PageHeader title="Talabalar uchun imkoniyatlar" description="Stipendiya, grant va amaliyotlarni toping. Saqlangan e'lonlar muddati yaqinlashganda eslatma oling."><Button onClick={() => setEditing("new")}><Plus className="size-4" />Imkoniyat ulashish</Button></PageHeader>
    {editing && <OpportunityEditor key={editing} opportunity={items.find((o) => o.id === editing)} close={() => setEditing(null)} />}{filters}
    {!items.length && <div className="rounded-xl border border-dashed p-10 text-center"><p className="font-medium">Bu filtrlarda e'lon yo'q</p><p className="mt-2 text-sm text-muted-foreground">Filtrlarni o'zgartiring yoki rasmiy manbadagi imkoniyatni ulashing.</p></div>}
    <div className="grid gap-4 xl:grid-cols-2">{items.map((o) => <article key={o.id} className={panel}><div className="flex justify-between gap-3"><div><p className="text-xs font-medium text-primary">{opportunityKinds[o.kind as keyof typeof opportunityKinds]}</p><h2 className="mt-1 text-lg font-semibold">{o.title}</h2><p className="text-sm text-muted-foreground">{o.organization}</p></div><Button variant={o.saved ? "default" : "outline"} size="icon" disabled={pending} aria-label={o.saved ? "Saqlanganlardan olib tashlash" : "E'lonni saqlash"} aria-pressed={o.saved} onClick={() => run(() => bookmarkOpportunity({ id: o.id, saved: !o.saved }), o.saved ? "Saqlanganlardan olindi" : "Saqlab qo'yildi")}><Bookmark className="size-4" /></Button></div>
      <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-3 py-1">{o.field}</span><span className="rounded-full bg-muted px-3 py-1">{o.minCourse}–{o.maxCourse}-kurs</span><span className="rounded-full bg-muted px-3 py-1">{o.language}</span></div>
      <p className="text-sm font-medium">Ariza muddati: {localDateKey(new Date(o.deadline))}</p><p className={o.verified ? "flex items-center gap-1 text-sm text-emerald-600" : "text-sm text-amber-600"}>{o.verified && <ShieldCheck className="size-4" />}{o.verified ? "Manbasi administrator tomonidan tekshirilgan" : "Jamoa ulashgan · hali tasdiqlanmagan"}</p>
      <p className="whitespace-pre-wrap break-words text-sm">{o.requirements}</p><a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ExternalLink className="size-4" />Rasmiy manba va ariza</a>
      <p className="text-xs text-muted-foreground">Yangilangan: {localDateKey(new Date(o.updatedAt))}</p><div className="flex flex-wrap gap-2">{o.userId === userId && <Button variant="ghost" onClick={() => setEditing(o.id)}>Tahrirlash</Button>}{(o.userId === userId || isAdmin) && <Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm("E'lon o'chirilsinmi?")) run(() => deleteOpportunity(o.id), "E'lon o'chirildi"); }}>O'chirish</Button>}{isAdmin && <Button variant="outline" disabled={pending} onClick={() => { if (!o.verified && !window.confirm("Rasmiy manba, talablar va muddatni tekshirdingizmi?")) return; run(() => verifyOpportunity({ id: o.id, verified: !o.verified }), "Tasdiqlash holati yangilandi"); }}>{o.verified ? "Tasdiqni bekor qilish" : "Manbani tasdiqlash"}</Button>}</div>
    </article>)}</div>
  </div>;
}
