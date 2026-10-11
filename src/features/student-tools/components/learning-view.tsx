"use client";
import { useState } from "react";
import { BookOpen, Plus, Sparkles, Trash2, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { generateCards, saveDeck, deleteDeck, reviewCard, submitQuiz } from "../learning-actions";
import type { CardInput } from "../schema";
import { Field, field, panel, useToolAction } from "./shared";
import { academicTimestamp } from "../algorithms";

export interface LearningDeck {
  id: string; title: string; subject: string;
  cards: (CardInput & { id: string; dueAt: string; repetitions: number })[];
  attempts: { id: string; correct: number; total: number; createdAt: string }[];
}
const blankCard = (): CardInput => ({ question: "", answer: "", distractors: [] });
type QuizResult = { correct: number; total: number; results: { id: string; question: string; answer: string; correct: boolean }[] };

function DeckEditor({ deck, notes, initialNote, close }: { deck?: LearningDeck; notes: { id: string; title: string }[]; initialNote: string; close: () => void }) {
  const { pending, run } = useToolAction();
  const [title, setTitle] = useState(deck?.title ?? "");
  const [subject, setSubject] = useState(deck?.subject ?? "");
  const [source, setSource] = useState("");
  const [noteId, setNoteId] = useState(initialNote);
  const [cards, setCards] = useState<CardInput[]>(deck?.cards ?? [blankCard()]);
  function update(index: number, change: Partial<CardInput>) { setCards((items) => items.map((c, i) => i === index ? { ...c, ...change } : c)); }
  return <section className={panel}>
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{deck ? "To'plamni tahrirlash" : "Yangi to'plam"}</h2><Button variant="ghost" onClick={close} disabled={pending}>Yopish</Button></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="To'plam nomi"><input className={field} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="Fan"><input className={field} value={subject} maxLength={100} onChange={(e) => setSubject(e.target.value)} /></Field></div>
    <details className="rounded-lg bg-muted/50 p-3" open={!deck}><summary className="cursor-pointer font-medium">AI yordamida savol yaratish</summary>
      <div className="mt-3 space-y-3"><Field label="Eslatmadan foydalanish"><select className={field} value={noteId} onChange={(e) => setNoteId(e.target.value)}><option value="">Matnni o'zim kiritaman</option>{notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}</select></Field>
      {!noteId && <Field label="O'quv matni"><textarea className={field} rows={5} maxLength={20000} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Konspekt yoki material matnini joylang..." /></Field>}
      <p className="text-xs text-muted-foreground">AI savollarini tekshirib, tahrirlagandan keyin saqlang. Yaratish joriy kartochkalar o'rnini almashtiradi.</p>
      <Button variant="outline" disabled={pending || (!noteId && source.trim().length < 30)} onClick={() => { if (cards.some((c) => c.question.trim()) && !window.confirm("Joriy kartochkalarni yangi AI savollari bilan almashtirasizmi?")) return; run(() => generateCards({ source, ...(noteId ? { noteId } : {}) }), "Savollar yaratildi. Tekshirib chiqing.", setCards); }}><Sparkles className="size-4" />{pending ? "Yaratilmoqda..." : "Savollar yaratish"}</Button></div>
    </details>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => saveDeck({ id: deck?.id, title, subject, cards }), "To'plam saqlandi", close); }}>
      {cards.map((card, index) => <div key={index} className="space-y-3 rounded-lg border p-4"><div className="flex justify-between"><h3 className="font-medium">{index + 1}-kartochka</h3><Button type="button" variant="ghost" size="icon" aria-label="Kartochkani olib tashlash" disabled={pending || cards.length === 1} onClick={() => setCards((all) => all.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div>
        <Field label="Savol"><textarea className={field} required maxLength={1000} rows={2} value={card.question} onChange={(e) => update(index, { question: e.target.value })} /></Field>
        <Field label="To'g'ri javob"><textarea className={field} required maxLength={2000} rows={2} value={card.answer} onChange={(e) => update(index, { answer: e.target.value })} /></Field>
        <Field label="Noto'g'ri variantlar (har qatorda bittadan, ixtiyoriy)"><textarea className={field} rows={3} maxLength={6002} value={card.distractors.join("\n")} onChange={(e) => update(index, { distractors: e.target.value.split("\n").slice(0, 3) })} onBlur={() => update(index, { distractors: card.distractors.map((s) => s.trim()).filter(Boolean) })} /></Field>
      </div>)}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={pending || cards.length >= 100} onClick={() => setCards([...cards, blankCard()])}><Plus className="size-4" />Kartochka qo'shish</Button><Button disabled={pending || !title.trim()} type="submit">{pending ? "Saqlanmoqda..." : "Saqlash"}</Button></div>
    </form>
  </section>;
}

function Practice({ deck, mode, now, close }: { deck: LearningDeck; mode: "review" | "quiz"; now: string; close: () => void }) {
  const { pending, run } = useToolAction();
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const due = deck.cards.filter((c) => c.dueAt <= now && !reviewed.includes(c.id));
  const card = due[0];
  return <section className={panel}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{deck.title} · {mode === "review" ? "Takrorlash" : "Test"}</h2><Button variant="ghost" disabled={pending} onClick={close}>Yopish</Button></div>
    {mode === "review" ? !card ? <p className="text-sm text-muted-foreground">Hozir takrorlanadigan kartochka yo'q. Qiyin kartochkalar 10 daqiqadan keyin qaytadi.</p> : <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Qolgan kartochkalar: {due.length}</p><p className="whitespace-pre-wrap text-lg font-medium">{card.question}</p>
      {!revealed ? <Button onClick={() => setRevealed(true)}>Javobni ochish</Button> : <><p className="whitespace-pre-wrap rounded-lg bg-muted p-4">{card.answer}</p><div className="flex gap-2">{[false, true].map((known) => <Button key={String(known)} variant={known ? "default" : "outline"} disabled={pending} onClick={() => run(() => reviewCard({ id: card.id, known }), "", () => { setReviewed([...reviewed, card.id]); setRevealed(false); })}>{known ? "Bildim" : "Qiyin bo'ldi"}</Button>)}</div></>}
    </div> : result ? <div className="space-y-3" aria-live="polite"><p className="text-xl font-semibold">Natija: {result.correct}/{result.total} ({Math.round(result.correct / result.total * 100)}%)</p><p className="text-sm text-muted-foreground">Xato javob berilgan kartochkalar takrorlash ro'yxatiga qaytdi.</p>{result.results.map((r) => <div key={r.id} className="rounded-lg border p-3"><p className={r.correct ? "text-emerald-600" : "text-amber-600"}>{r.correct ? "✓" : "✗"} {r.question}</p><p className="mt-1 whitespace-pre-wrap text-sm">Javob: {r.answer}</p></div>)}<Button variant="outline" onClick={() => { setResult(null); setAnswers({}); }}>Qayta ishlash</Button></div> : <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); run(() => submitQuiz({ deckId: deck.id, answers: deck.cards.map((c) => ({ cardId: c.id, answer: answers[c.id] ?? "" })) }), "Test natijasi saqlandi", setResult); }}>
      {deck.cards.map((c, i) => {
        const options = [c.answer, ...c.distractors];
        const offset = c.id.split("").reduce((n, char) => n + char.charCodeAt(0), 0) % options.length;
        const shuffled = [...options.slice(offset), ...options.slice(0, offset)];
        return <fieldset key={c.id} className="space-y-2 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">{i + 1}. {c.question}</legend>{c.distractors.length ? shuffled.map((o) => <label key={o} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"><input type="radio" required name={c.id} value={o} checked={answers[c.id] === o} onChange={() => setAnswers({ ...answers, [c.id]: o })} /><span className="whitespace-pre-wrap text-sm">{o}</span></label>) : <input aria-label={`${i + 1}-savolga javob`} className={field} required maxLength={2000} value={answers[c.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [c.id]: e.target.value })} placeholder="Javobni yozing (aniq matn bo'yicha tekshiriladi)" />}</fieldset>;
      })}<Button type="submit" disabled={pending}>{pending ? "Tekshirilmoqda..." : "Testni yakunlash"}</Button>
    </form>}
  </section>;
}

export function LearningView({ decks, notes, initialNote, now, dueCount }: { decks: LearningDeck[]; notes: { id: string; title: string }[]; initialNote: string; now: string; dueCount: number }) {
  const { pending, run } = useToolAction();
  const [editor, setEditor] = useState<string | null>(initialNote ? "new" : null);
  const [practice, setPractice] = useState<{ id: string; mode: "review" | "quiz" } | null>(null);
  const active = decks.find((d) => d.id === practice?.id);
  return <div className="space-y-6"><PageHeader title="Test va kartochkalar" description="Bilimingizni tekshiring va qiyin mavzularni vaqt oralig'ida takrorlang."><Button onClick={() => { setEditor("new"); setPractice(null); }}><Plus className="size-4" />To'plam yaratish</Button></PageHeader>
    <div className="rounded-xl bg-primary/10 p-4"><p className="font-semibold">Bugun takrorlash: {dueCount} ta kartochka</p><p className="mt-1 text-sm text-muted-foreground">Har bir to'plamdagi “Takrorlash” tugmasidan boshlang. Eslatmalar bildirishnoma sozlamangizga amal qiladi.</p></div>
    {editor !== null && <DeckEditor key={editor} deck={decks.find((d) => d.id === editor)} notes={notes} initialNote={initialNote} close={() => setEditor(null)} />}
    {active && practice && <Practice key={`${active.id}-${practice.mode}`} deck={active} mode={practice.mode} now={now} close={() => setPractice(null)} />}
    {!decks.length && editor === null && <div className="rounded-xl border border-dashed p-10 text-center"><BookOpen className="mx-auto mb-3 size-8 text-primary" /><p>Matn yoki eslatmadan birinchi kartochkalaringizni yarating.</p></div>}
    <div className="grid gap-4 lg:grid-cols-2">{decks.map((deck) => <article key={deck.id} className={panel}><div><h2 className="font-semibold">{deck.title}</h2><p className="text-sm text-muted-foreground">{deck.subject || "Umumiy"} · {deck.cards.length} kartochka · {deck.cards.filter((c) => c.dueAt <= now).length} takrorlash</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setPractice({ id: deck.id, mode: "review" }); setEditor(null); }}><RotateCcw className="size-4" />Takrorlash</Button><Button onClick={() => { setPractice({ id: deck.id, mode: "quiz" }); setEditor(null); }}><CheckCircle className="size-4" />Test</Button><Button variant="ghost" onClick={() => { setEditor(deck.id); setPractice(null); }}>Tahrirlash</Button><Button variant="ghost" size="icon" aria-label="To'plamni o'chirish" disabled={pending} onClick={() => { if (window.confirm("To'plam va test tarixi o'chirilsinmi?")) run(() => deleteDeck(deck.id), "To'plam o'chirildi", () => { if (editor === deck.id) setEditor(null); if (practice?.id === deck.id) setPractice(null); }); }}><Trash2 className="size-4" /></Button></div>
      {!!deck.attempts.length && <details><summary className="cursor-pointer text-sm">Oxirgi test natijalari</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{deck.attempts.map((a) => <li key={a.id}>{academicTimestamp(a.createdAt)}: {a.correct}/{a.total}</li>)}</ul></details>}
    </article>)}</div>
  </div>;
}
