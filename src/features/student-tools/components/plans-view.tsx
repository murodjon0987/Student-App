"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { saveStudyPlan, reschedulePlan, completePlanTask, deleteStudyPlan } from "../plan-actions";
import { Field, field, panel, useToolAction } from "./shared";
import { localDateKey } from "../algorithms";

export interface PlanItem {
  id: string; examId: string; title: string; date: string; dailyMinutes: number; totalMinutes: number;
  tasks: { id: string; topic: string; minutes: number; date: string; done: boolean }[];
}
function PlanCard({ plan, today }: { plan: PlanItem; today: string }) {
  const { pending, run } = useToolAction();
  const [dailyMinutes, setDaily] = useState(plan.dailyMinutes);
  const done = plan.tasks.filter((t) => t.done).reduce((s, t) => s + t.minutes, 0);
  const scheduled = plan.tasks.reduce((s, t) => s + t.minutes, 0);
  const overdue = plan.tasks.filter((t) => !t.done && localDateKey(new Date(t.date)) < today);
  return <article className={panel}><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{plan.title}</h2><p className="text-sm text-muted-foreground">Imtihon: {localDateKey(new Date(plan.date))} · {Math.round(done / plan.totalMinutes * 100)}% bajarildi</p></div><Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm("Tayyorgarlik rejasini o'chirasizmi?")) run(() => deleteStudyPlan(plan.id), "Reja o'chirildi"); }}>O'chirish</Button></div>
    <progress className="h-2 w-full accent-primary" value={done} max={plan.totalMinutes} aria-label="Tayyorgarlik darajasi" />
    {plan.totalMinutes > scheduled && <p className="rounded-lg bg-amber-500/10 p-3 text-sm">{plan.totalMinutes - scheduled} daqiqa mavzu jadvalga sig'madi. Kunlik vaqtni oshirib qayta taqsimlang.</p>}
    {!!overdue.length && <p className="text-sm text-amber-600">{overdue.length} ta mashg'ulot o'tkazib yuborilgan. Qolgan kunlarga qayta taqsimlashingiz mumkin.</p>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => reschedulePlan({ id: plan.id, dailyMinutes }), "Reja qayta taqsimlandi"); }}><Field label="Kunlik vaqt (daqiqa)"><input className={field} type="number" required min={10} max={480} value={dailyMinutes} onChange={(e) => setDaily(Number(e.target.value))} /></Field><Button type="submit" variant="outline" disabled={pending}>Qolganini qayta taqsimlash</Button></form>
    <details open><summary className="cursor-pointer font-medium">Mashg'ulotlar ({plan.tasks.length})</summary><div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">{plan.tasks.map((task) => <label key={task.id} className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" className="mt-1" disabled={pending} checked={task.done} onChange={(e) => run(() => completePlanTask({ id: task.id, done: e.target.checked }), "")} /><span className="min-w-0"><span className={task.done ? "line-through text-muted-foreground" : "font-medium"}>{task.topic}</span><span className="block text-xs text-muted-foreground">{localDateKey(new Date(task.date))} · {task.minutes} daqiqa{localDateKey(new Date(task.date)) === today ? " · Bugun" : ""}</span></span></label>)}</div></details>
  </article>;
}
export function PlansView({ plans, exams, initialExam, today }: { plans: PlanItem[]; exams: { id: string; title: string; date: string }[]; initialExam: string; today: string }) {
  const { pending, run } = useToolAction();
  const [examId, setExam] = useState(initialExam || exams[0]?.id || "");
  const [daily, setDaily] = useState(40);
  const [topics, setTopics] = useState([{ name: "", minutes: 60 }]);
  const [showForm, setShowForm] = useState(!!initialExam || plans.length === 0);
  return <div className="space-y-6"><PageHeader title="Imtihonga tayyorgarlik" description="Mavzularni kunlarga ajrating va bajarilmagan ishlarni qayta rejalashtiring."><Button onClick={() => setShowForm(!showForm)}>{showForm ? "Yopish" : "Reja yaratish"}</Button></PageHeader>
    {showForm && <form className={panel} onSubmit={(e) => { e.preventDefault(); if (plans.some((p) => p.examId === examId) && !window.confirm("Bu imtihonning avvalgi rejasi va bajarilish tarixi almashtirilsinmi?")) return; run(() => saveStudyPlan({ examId, dailyMinutes: daily, topics }), "Reja yaratildi", () => setShowForm(false)); }}>
      {!exams.length ? <p>Avval <Link href="/exams" className="text-primary underline">kelajakdagi imtihon qo'shing</Link>.</p> : <><div className="grid gap-3 sm:grid-cols-2"><Field label="Imtihon"><select className={field} required value={examId} onChange={(e) => setExam(e.target.value)}>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title} · {localDateKey(new Date(exam.date))}</option>)}</select></Field><Field label="Kunlik bo'sh vaqt (daqiqa)"><input className={field} required type="number" min={10} max={480} value={daily} onChange={(e) => setDaily(Number(e.target.value))} /></Field></div>
      <p className="text-sm text-muted-foreground">Har bir mavzuga kerakli umumiy vaqtni kiriting. Reja bugundan imtihon kunigacha tuziladi.</p>
      {topics.map((topic, i) => <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_130px_auto]"><Field label={`${i + 1}. Mavzu`}><input className={field} required maxLength={160} value={topic.name} onChange={(e) => setTopics(topics.map((t, j) => j === i ? { ...t, name: e.target.value } : t))} /></Field><Field label="Daqiqa"><input className={field} type="number" required min={10} max={1440} value={topic.minutes} onChange={(e) => setTopics(topics.map((t, j) => j === i ? { ...t, minutes: Number(e.target.value) } : t))} /></Field><Button type="button" variant="ghost" disabled={topics.length === 1 || pending} onClick={() => setTopics(topics.filter((_, j) => j !== i))}>Olib tashlash</Button></div>)}
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={topics.length >= 50 || pending} onClick={() => setTopics([...topics, { name: "", minutes: 60 }])}>Mavzu qo'shish</Button><Button type="submit" disabled={pending}>{pending ? "Tuzilmoqda..." : "Reja tuzish"}</Button></div></>}
    </form>}
    {plans.map((plan) => <PlanCard key={`${plan.id}-${plan.dailyMinutes}`} plan={plan} today={today} />)}
    {!plans.length && !showForm && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Hozircha tayyorgarlik rejasi yo'q.</p>}
  </div>;
}
