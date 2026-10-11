import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/http";
import { buildStudentContext } from "@/features/ai/context";
import { isAiConfigured, streamGemini, type AiMessage } from "@/features/ai/gemini";
import {
  generateImage,
  isImageGenerationConfigured,
  isImageRequest,
} from "@/features/ai/image";
import { chatRequestSchema } from "@/features/ai/schema";
import { redactProviderTokens } from "@/features/ai/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HISTORY_LIMIT = 20;

const SYSTEM_PROMPT = `Sen "Student App" platformasidagi aqlli o'quv yordamchisisan. Talabalarga o'qish, rejalashtirish, motivatsiya va kundalik masalalarda yordam berasan.

Qoidalar:
- Javobni foydalanuvchi yozgan tilda ber (o'zbekcha yozsa o'zbekcha, inglizcha yozsa inglizcha).
- Quyida berilgan talaba ma'lumotlaridan faqat kerak bo'lganda foydalan. Ma'lumotda yo'q narsani o'ylab topma.
- Javoblar aniq, qisqa va amaliy bo'lsin. Kerak bo'lsa ro'yxat yoki qadamlar bilan tushuntir.
- Matematika, dasturlash va fan savollarida bosqichma-bosqich yechim ber.
- Vazifa, jadval yoki imtihon haqida so'ralsa, talabaning haqiqiy ma'lumotlariga tayanib ayt.
- Metro/avtobus yo'l haqi va yo'nalishlari haqida so'ralsa, transport ma'lumotlariga tayanib ayt.
- Rasm chizishni so'rashsa, "men rasm generatsiya qila olmayman" deb aytma. Ilova rasm so'rovlarini alohida rasm generatoriga yo'naltiradi; agar so'rov rasm generatoriga yetib bormagan bo'lsa, foydalanuvchiga chat oynasidagi rasm tugmasidan foydalanishni maslahat ber.
- Javobni Markdown'da yoz (sarlavha, ro'yxat, kod bloklari).`;

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session?.userId) {
    return Response.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }
  const userId = session.userId;

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return Response.json({ error: error instanceof RequestBodyError ? error.message : "Noto'g'ri so'rov" }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
      { status: 400 }
    );
  }

  const { chatId: inputChatId, message, mode } = parsed.data;

  const wantsImage = mode === "image" || isImageRequest(message);
  if ((wantsImage && !isImageGenerationConfigured()) || (!wantsImage && !isAiConfigured())) {
    return Response.json({ error: "AI xizmati hozircha mavjud emas. Keyinroq urinib ko'ring." }, { status: 503 });
  }
  try {
    const limits = await Promise.all([
      consumeRateLimit("ai:minute", userId, 10, 60_000),
      consumeRateLimit("ai:day", userId, 120, 24 * 60 * 60_000),
      ...(wantsImage ? [consumeRateLimit("ai:image-day", userId, 5, 24 * 60 * 60_000)] : []),
    ]);
    const denied = limits.filter((limit) => !limit.allowed);
    if (denied.length) {
      const retryAfter = Math.max(...denied.map((limit) => limit.retryAfter));
      return Response.json({ error: "AI so'rovlari limiti tugadi. Biroz kutib, qaytadan urinib ko'ring." }, {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      });
    }
  } catch {
    console.error("[ai/chat] rate limit storage unavailable");
    return Response.json({ error: "AI xizmati vaqtincha mavjud emas" }, { status: 503 });
  }

  let chatId = inputChatId || null;
  let title = "Yangi suhbat";

  if (chatId) {
    const existing = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      select: { id: true, title: true },
    });
    if (!existing) {
      return Response.json({ error: "Suhbat topilmadi" }, { status: 404 });
    }
    title = existing.title;
  } else {
    title = message.replace(/\s+/g, " ").slice(0, 60);
    const created = await prisma.chat.create({
      data: { userId, title },
      select: { id: true },
    });
    chatId = created.id;
  }

  await prisma.chatMessage.create({
    data: { chatId, role: "user", content: message },
  });

  if (wantsImage) {
    return streamImageResponse({
      request,
      userId,
      chatId,
      title,
      message,
    });
  }

  const recent = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });

  const messages: AiMessage[] = recent
    .reverse()
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: redactProviderTokens(m.content),
    }));

  const context = await buildStudentContext(userId);
  const system = `${SYSTEM_PROMPT}\n\n===== TALABA MA'LUMOTLARI =====\n${context}`;

  const encoder = new TextEncoder();
  const finalChatId = chatId;
  const cancellation = new AbortController();
  const signal = AbortSignal.any([request.signal, cancellation.signal, AbortSignal.timeout(50_000)]);
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        if (cancelled) return;
        try { controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`)); }
        catch { cancelled = true; cancellation.abort(); }
      };

      send({ type: "meta", chatId: finalChatId, title });

      let full = "";
      try {
        for await (const chunk of streamGemini({
          system,
          messages,
          signal,
        })) {
          full += chunk;
          send({ type: "delta", text: chunk });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // foydalanuvchi to'xtatdi
        } else {
          console.error("[ai/chat] stream error", error);
          send({
            type: "error",
            message: "AI bilan bog'lanishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
          });
        }
      } finally {
        if (full.trim()) {
          try {
            await prisma.chatMessage.create({
              data: { chatId: finalChatId, role: "assistant", content: full },
            });
            await prisma.chat.update({
              where: { id: finalChatId },
              data: { updatedAt: new Date() },
            });
          } catch (error) {
            console.error("[ai/chat] save error", error);
          }
        }
        send({ type: "done" });
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; cancellation.abort(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function streamImageResponse({
  request,
  userId,
  chatId,
  title,
  message,
}: {
  request: NextRequest;
  userId: string;
  chatId: string;
  title: string;
  message: string;
}) {
  const encoder = new TextEncoder();
  const cancellation = new AbortController();
  const signal = AbortSignal.any([request.signal, cancellation.signal, AbortSignal.timeout(50_000)]);
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        if (cancelled) return;
        try { controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`)); }
        catch { cancelled = true; cancellation.abort(); }
      };

      send({ type: "meta", chatId, title });

      let full = "";
      try {
        const image = await generateImage(userId, message, signal);
        const alt = image.prompt.replace(/[\[\]]/g, "");
        full = `Mana siz so'ragan rasm:\n\n![${alt}](${image.url})`;
        send({ type: "delta", text: full });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // foydalanuvchi to'xtatdi
        } else {
          console.error("[ai/chat] image error", error);
          send({
            type: "error",
            message: "Rasm generatsiya qilishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
          });
        }
      } finally {
        if (full.trim()) {
          try {
            await prisma.chatMessage.create({
              data: { chatId, role: "assistant", content: full },
            });
            await prisma.chat.update({
              where: { id: chatId },
              data: { updatedAt: new Date() },
            });
          } catch (error) {
            console.error("[ai/chat] save error", error);
          }
        }
        send({ type: "done" });
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; cancellation.abort(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
