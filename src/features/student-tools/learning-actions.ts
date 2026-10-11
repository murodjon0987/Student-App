"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok } from "@/lib/types";
import { deckSchema, cardSchema, idSchema } from "./schema";
import { nextReview } from "./algorithms";
import { generateStructured } from "./ai";

export async function generateCards(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ source: z.string().trim().max(20000).default(""), noteId: idSchema.optional() }).safeParse(input);
  if (!parsed.success) return fail("Matn 20 000 belgidan oshmasin");
  try {
    let source = parsed.data.source;
    if (parsed.data.noteId) {
      const note = await prisma.note.findFirst({ where: { id: parsed.data.noteId, userId }, select: { content: true } });
      if (!note) return fail("Eslatma topilmadi");
      source = note.content.slice(0, 20000);
    }
    if (source.length < 30) return fail("Kamida 30 belgili o'quv matnini kiriting");
    const cards = await generateStructured(userId, "Berilgan o'quv matnidan 5-15 ta o'zbekcha savol yarat. Har biri {question,answer,distractors:[3 ta noto'g'ri variant]}. Javob matnda bo'lsin, variantlar takrorlanmasin. Natija JSON massiv.", { role: "user", content: source }, z.array(cardSchema).min(1).max(20));
    return ok(cards);
  } catch (e) { return fail(e instanceof Error ? e.message : "Kartochkalar yaratilmagan"); }
}

export async function saveDeck(input: unknown) {
  const { userId } = await verifySession();
  const parsed = deckSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri");
  const data = parsed.data;
  try {
    const id = await prisma.$transaction(async (tx) => {
      if (!data.id) {
        const deck = await tx.flashcardDeck.create({ data: { userId, title: data.title, subject: data.subject, cards: { create: data.cards.map(({ question, answer, distractors }) => ({ question, answer, distractors })) } } });
        return deck.id;
      }
      const deck = await tx.flashcardDeck.findFirst({ where: { id: data.id, userId }, include: { cards: true } });
      if (!deck) throw new Error("To'plam topilmadi");
      const ids = data.cards.flatMap((c) => c.id ? [c.id] : []);
      if (new Set(ids).size !== ids.length || ids.some((id) => !deck.cards.some((c) => c.id === id))) throw new Error("Kartochka topilmadi");
      await tx.flashcardDeck.update({ where: { id: deck.id, userId }, data: { title: data.title, subject: data.subject } });
      await tx.flashcard.deleteMany({ where: { deckId: deck.id, id: { notIn: ids } } });
      for (const card of data.cards) {
        const old = deck.cards.find((c) => c.id === card.id);
        const reset = old && (old.question !== card.question || old.answer !== card.answer);
        if (card.id) await tx.flashcard.update({ where: { id: card.id, deckId: deck.id }, data: { question: card.question, answer: card.answer, distractors: card.distractors, ...(reset ? { repetitions: 0, intervalDays: 0, dueAt: new Date(), lastReviewedAt: null } : {}) } });
        else await tx.flashcard.create({ data: { deckId: deck.id, question: card.question, answer: card.answer, distractors: card.distractors } });
      }
      return deck.id;
    });
    revalidatePath("/learn"); return ok({ id });
  } catch (e) { return fail(e instanceof Error && e.message.includes("topilmadi") ? e.message : "Saqlab bo'lmadi"); }
}

export async function deleteDeck(input: unknown) {
  const { userId } = await verifySession();
  const id = idSchema.safeParse(input); if (!id.success) return fail("To'plam noto'g'ri");
  try {
    const deleted = await prisma.flashcardDeck.deleteMany({ where: { id: id.data, userId } });
    if (!deleted.count) return fail("To'plam topilmadi");
    revalidatePath("/learn"); return ok();
  } catch { return fail("O'chirib bo'lmadi"); }
}

export async function reviewCard(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ id: idSchema, known: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Baholash noto'g'ri");
  try {
    const card = await prisma.flashcard.findFirst({ where: { id: parsed.data.id, deck: { userId } } });
    if (!card) return fail("Kartochka topilmadi");
    const now = new Date();
    if (card.dueAt > now) return fail("Bu kartochkaning takrorlash vaqti hali kelmagan");
    const schedule = nextReview(card.repetitions, card.intervalDays, parsed.data.known, now);
    const updated = await prisma.flashcard.updateMany({ where: { id: card.id, dueAt: card.dueAt, deck: { userId } }, data: { ...schedule, lastReviewedAt: now } });
    if (!updated.count) return fail("Kartochka allaqachon baholangan");
    revalidatePath("/learn"); return ok({ dueAt: schedule.dueAt.toISOString() });
  } catch { return fail("Bahoni saqlab bo'lmadi"); }
}

export async function submitQuiz(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ deckId: idSchema, answers: z.array(z.object({ cardId: idSchema, answer: z.string().max(2000) })).min(1).max(100) }).safeParse(input);
  if (!parsed.success) return fail("Javoblar noto'g'ri");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const deck = await tx.flashcardDeck.findFirst({ where: { id: parsed.data.deckId, userId }, include: { cards: true } });
      if (!deck) throw new Error("To'plam topilmadi");
      const answers = new Map(parsed.data.answers.map((a) => [a.cardId, a.answer.trim().toLocaleLowerCase()]));
      if (answers.size !== deck.cards.length || parsed.data.answers.length !== deck.cards.length || deck.cards.some((c) => !answers.has(c.id))) throw new Error("Barcha savollarga javob bering");
      const results = deck.cards.map((card) => ({ id: card.id, question: card.question, answer: card.answer, correct: answers.get(card.id) === card.answer.trim().toLocaleLowerCase() }));
      const correct = results.filter((r) => r.correct).length;
      await tx.quizAttempt.create({ data: { userId, deckId: deck.id, correct, total: results.length } });
      await tx.flashcard.updateMany({ where: { deckId: deck.id, id: { in: results.filter((r) => !r.correct).map((r) => r.id) } }, data: { dueAt: new Date(), repetitions: 0, intervalDays: 0 } });
      return { correct, total: results.length, results };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/learn"); return ok(result);
  } catch (e) { return fail(e instanceof Error && ["To'plam topilmadi", "Barcha savollarga javob bering"].includes(e.message) ? e.message : "Natijani saqlab bo'lmadi"); }
}
