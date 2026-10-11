"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok } from "@/lib/types";
import { consumeRateLimit } from "@/lib/rate-limit";
import { importRowsSchema } from "./schema";
import { parseScheduleCsv, scheduleKey, overlaps } from "./algorithms";
import { generateStructured } from "./ai";

const MAX_FILE = 3 * 1024 * 1024;
export async function previewScheduleImport(data: FormData) {
  const { userId } = await verifySession();
  try {
    const file = data.get("file");
    const text = data.get("text");
    let content = typeof text === "string" ? text.trim() : "";
    if (content.length > 20000) return fail("Matn 20 000 belgidan oshmasin");
    let attachment: { mimeType: string; data: string } | undefined;
    if (file instanceof File && file.size) {
      if (file.size > MAX_FILE) return fail("Fayl 3 MB dan oshmasin");
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "csv" || ext === "txt") {
        content = bytes.toString("utf8");
        if (content.length > 20000) return fail("Matn 20 000 belgidan oshmasin");
        if (ext === "csv") return ok(parseScheduleCsv(content));
      } else {
        let mimeType = "";
        if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mimeType = "image/png";
        else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mimeType = "image/jpeg";
        else if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") mimeType = "image/webp";
        else if (bytes.subarray(0, 5).toString() === "%PDF-") mimeType = "application/pdf";
        if (!mimeType) return fail("CSV, TXT, PDF, PNG, JPEG yoki WebP fayl kiriting");
        attachment = { mimeType, data: bytes.toString("base64") };
      }
    }
    if (!content && !attachment) return fail("Matn yoki jadval faylini kiriting");
    const rows = await generateStructured(userId, "Haftalik dars jadvalini o'qi. JSON massiv: [{title,dayOfWeek,startTime,endTime,teacher,room}]. dayOfWeek: dushanba=1,...yakshanba=7. Vaqt HH:mm. Faqat aniq ko'rinadigan darslar, vaqtni o'ylab topma. teacher va room noma'lum bo'lsa bo'sh satr. Jadval bo'lmasa [] qaytar.", { role: "user", content: content || "Hujjatdagi jadvalni ajrat.", attachment }, importRowsSchema);
    return ok(rows);
  } catch (e) { return fail(e instanceof Error && !e.message.startsWith("[") ? e.message : "Jadvalni o'qib bo'lmadi. CSV formatini tekshiring."); }
}

export async function confirmScheduleImport(input: unknown) {
  const { userId } = await verifySession();
  const parsed = importRowsSchema.safeParse(input);
  if (!parsed.success) return fail("Dars nomi, hafta kuni va vaqtlarini tekshiring");
  try {
    if (!(await consumeRateLimit("schedule-import", userId, 10, 3600_000)).allowed) return fail("Import limiti tugadi. Keyinroq urinib ko'ring.");
    const count = await prisma.$transaction(async (tx) => {
      const existing = await tx.schedule.findMany({ where: { userId } });
      const keys = new Set(existing.map(scheduleKey));
      const fresh = parsed.data.filter((row) => {
        const key = scheduleKey(row);
        if (keys.has(key)) return false;
        keys.add(key); return true;
      });
      for (let i = 0; i < fresh.length; i++) {
        if (existing.some((row) => overlaps(row, fresh[i])) || fresh.slice(0, i).some((row) => overlaps(row, fresh[i]))) throw new Error("Bir vaqtdagi darslar to'qnashmoqda. Vaqtlarni tuzating yoki ortiqcha qatorni olib tashlang.");
      }
      if (fresh.length) await tx.schedule.createMany({ data: fresh.map((row) => ({ ...row, userId, color: "#6366f1", teacher: row.teacher || null, room: row.room || null })) });
      return fresh.length;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/", "layout"); return ok({ count, skipped: parsed.data.length - count });
  } catch (e) { return fail(e instanceof Error && e.message.startsWith("Bir vaqtdagi") ? e.message : "Importni saqlab bo'lmadi. Qayta urinib ko'ring."); }
}
