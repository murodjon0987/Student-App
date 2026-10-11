"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { previewScheduleImport, confirmScheduleImport } from "../import-actions";
import type { ImportRow } from "../schema";
import { Field, field, panel, useToolAction } from "./shared";

const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
export function ImportView() {
  const { pending, run } = useToolAction();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [saved, setSaved] = useState<{ count: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  function update(index: number, change: Partial<ImportRow>) { setRows(rows.map((r, i) => i === index ? { ...r, ...change } : r)); }
  return <div className="space-y-6"><PageHeader title="Jadvalni import qilish" description="Rasm, PDF yoki matndan darslarni ajrating, tekshiring va jadvalingizga qo'shing." />
    <form className={panel} onSubmit={(e) => { e.preventDefault(); if (rows.length && !window.confirm("Joriy tahrirlangan qatorlar yangi import bilan almashtirilsinmi?")) return; const data = new FormData(e.currentTarget); run(() => previewScheduleImport(data), "Darslarni tekshirib chiqing", (result) => { setRows(result); setSaved(null); }); }}>
      <Field label="Jadval fayli (3 MB gacha)"><input className={field} type="file" name="file" accept=".csv,.txt,.pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size > 3 * 1024 * 1024) { setError("Fayl 3 MB dan oshmasin"); e.target.value = ""; } else setError(""); }} /></Field>
      <Field label="Yoki jadval matni"><textarea className={field} name="text" maxLength={20000} rows={5} placeholder="Dushanba 09:00–10:20 Matematika, 204-xona..." /></Field>
      <p className="text-sm text-muted-foreground">CSV avtomatik o'qiladi. Rasm, PDF va oddiy matn AI yordamida tahlil qilinadi. Fayl saqlanmaydi.</p>
      <details><summary className="cursor-pointer text-sm text-primary">CSV namunasi</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{"title,dayOfWeek,startTime,endTime,teacher,room\nMatematika,1,09:00,10:20,Aliyev,204\nIngliz tili,2,11:00,12:20,Karimova,305"}</pre><a className="mt-2 inline-block text-sm text-primary underline" href="/schedule-template.csv" download>CSV namunani yuklab olish</a></details>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={pending || !!error} type="submit">{pending ? "O'qilmoqda..." : "Darslarni ajratish"}</Button>
    </form>
    {!!rows.length && <form className={panel} onSubmit={(e) => { e.preventDefault(); run(() => confirmScheduleImport(rows), "Jadval yangilandi", (result) => { setSaved(result); setRows([]); }); }}>
      <h2 className="font-semibold">Saqlashdan oldin tekshiring ({rows.length} dars)</h2><p className="text-sm text-muted-foreground">Takroriy darslar o'tkazib yuboriladi. Vaqtlar to'qnashsa, tuzatish so'raladi.</p>
      {rows.map((row, i) => <div key={i} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="Dars nomi"><input className={field} required maxLength={160} value={row.title} onChange={(e) => update(i, { title: e.target.value })} /></Field><Field label="Hafta kuni"><select className={field} value={row.dayOfWeek} onChange={(e) => update(i, { dayOfWeek: Number(e.target.value) })}>{days.map((d, j) => <option key={d} value={j + 1}>{d}</option>)}</select></Field><div className="grid grid-cols-2 gap-2"><Field label="Boshlanish"><input className={field} type="time" required value={row.startTime} onChange={(e) => update(i, { startTime: e.target.value })} /></Field><Field label="Tugash"><input className={field} type="time" required value={row.endTime} onChange={(e) => update(i, { endTime: e.target.value })} /></Field></div><Field label="O'qituvchi"><input className={field} maxLength={160} value={row.teacher} onChange={(e) => update(i, { teacher: e.target.value })} /></Field><Field label="Xona"><input className={field} maxLength={100} value={row.room} onChange={(e) => update(i, { room: e.target.value })} /></Field><Button type="button" variant="outline" disabled={pending} onClick={() => setRows(rows.filter((_, j) => i !== j))}>Qatorni olib tashlash</Button></div>)}
      <Button type="submit" disabled={pending}>Tasdiqlash va jadvalga qo'shish</Button>
    </form>}
    {saved && <div className={panel} role="status"><p>{saved.count} ta dars qo'shildi, {saved.skipped} ta takroriy dars o'tkazib yuborildi.</p><Link href="/schedule" className="text-primary underline">Dars jadvalini ochish →</Link></div>}
  </div>;
}
