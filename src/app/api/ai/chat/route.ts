import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { decrypt, getSessionToken } from "@/lib/auth/session";
import { buildStudentContext } from "@/features/ai/context";
import { isAiConfigured, streamGemini, type AiMessage } from "@/features/ai/gemini";
import {
  generateImage,
  isImageGenerationConfigured,
  isImageRequest,
} from "@/features/ai/image";
import { chatRequestSchema } from "@/features/ai/schema";

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
  const session = await decrypt(await getSessionToken());
  if (!session?.userId) {
    return Response.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }
  const userId = session.userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
      { status: 400 }
    );
  }

  const { chatId: inputChatId, message, mode } = parsed.data;

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

  const wantsImage = mode === "image" || isImageRequest(message);

  if (wantsImage && isImageGenerationConfigured()) {
    return streamImageResponse({
      request,
      chatId,
      title,
      message,
    });
  }

  if (!isAiConfigured()) {
    return Response.json(
      {
        error:
          "AI hali sozlanmagan. Vercel'da GEMINI_API_KEY environment variable qo'shing.",
      },
      { status: 503 }
    );
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
      content: m.content,
    }));

  const context = await buildStudentContext(userId);
  const system = `${SYSTEM_PROMPT}\n\n===== TALABA MA'LUMOTLARI =====\n${context}`;

  const encoder = new TextEncoder();
  const finalChatId = chatId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      send({ type: "meta", chatId: finalChatId, title });

      let full = "";
      try {
        for await (const chunk of streamGemini({
          system,
          messages,
          signal: request.signal,
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
            message:
              error instanceof Error
                ? error.message
                : "AI bilan bog'lanishda xatolik yuz berdi",
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
        controller.close();
      }
    },
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
  chatId,
  title,
  message,
}: {
  request: NextRequest;
  chatId: string;
  title: string;
  message: string;
}) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      send({ type: "meta", chatId, title });

      let full = "";
      try {
        const image = await generateImage(message, request.signal);
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
            message:
              error instanceof Error
                ? error.message
                : "Rasm generatsiya qilishda xatolik yuz berdi",
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
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
