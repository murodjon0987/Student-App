import "server-only";

import { prisma } from "@/lib/prisma";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;

// Gemini rasm modellari (billing yoqilganda bepul kvota 0 bo'lgani uchun
// avtomatik ravishda Pollinations'ga qaytamiz).
const GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
];

const IMAGE_PROMPT_SYSTEM = `Sen professional rasm-generatsiya prompt muhandisisan. Foydalanuvchi so'rovini (o'zbek, rus yoki ingliz tilida bo'lishi mumkin) tahlil qilib, tasvir generatori uchun aniq, batafsil INGLIZ tilidagi prompt yoz.

Qoidalar:
- Foydalanuvchi aynan nima so'ragan bo'lsa, faqat shuni tasvirlab ber. Yangi mavzu, shaxs yoki narsa qo'shma.
- Uslub, rang, kompozitsiya, yorug'lik, perspektiva va muhim detallarni aniq yoz.
- Agar foydalanuvchi matn/logo so'rasa, undagi yozuvni alohida ko'rsat.
- Javobda FAQAT ingliz tilidagi prompt matnini qaytar. Boshqa izoh, kirish so'zi yoki qo'shtirnoq qo'shma.`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isImageGenerationConfigured() {
  return process.env.AI_IMAGE_DISABLED !== "1";
}

function getImageProvider(): "auto" | "gemini" | "pollinations" {
  const value = process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase();
  if (value === "gemini" || value === "pollinations") return value;
  return "auto";
}

function getGeminiKey() {
  return process.env.GEMINI_API_KEY?.trim();
}

function getImageSize() {
  const width = Number(process.env.POLLINATIONS_IMAGE_WIDTH) || DEFAULT_WIDTH;
  const height = Number(process.env.POLLINATIONS_IMAGE_HEIGHT) || DEFAULT_HEIGHT;
  return {
    width: Math.min(Math.max(width, 256), 2048),
    height: Math.min(Math.max(height, 256), 2048),
  };
}

// ---------------------------------------------------------------------------
// So'rovni aniqlash
// ---------------------------------------------------------------------------

const SUBJECT_WORDS = [
  "rasm",
  "surat",
  "tasvir",
  "illyustratsiya",
  "dizayn",
  "logo",
  "image",
  "picture",
  "photo",
  "drawing",
  "painting",
  "illustration",
  "artwork",
  "картин",
  "изображен",
  "рисун",
];

const ACTION_WORDS = [
  "chiz",
  "yasab",
  "yasang",
  "yasash",
  "yarat",
  "generatsiya",
  "generate",
  "draw",
  "paint",
  "create",
  "make",
  "design",
  "illustrate",
  "нарисуй",
  "нарисуйте",
  "сгенерируй",
  "создай",
];

const GENERIC_SUBJECT_PREFIXES = [
  "rasm",
  "surat",
  "tasvir",
  "image",
  "picture",
  "photo",
  "drawing",
  "painting",
  "illustration",
  "картин",
  "изображен",
  "рисун",
];

const CLEANUP_WORDS = new Set([
  "menga",
  "iltimos",
  "marhamat",
  "qilib",
  "qil",
  "ber",
  "bering",
  "bersin",
  "kerak",
  "chiz",
  "chizing",
  "chizib",
  "chizish",
  "yasab",
  "yasang",
  "yasash",
  "yarat",
  "yarating",
  "yaratib",
  "yaratish",
  "generatsiya",
  "generate",
  "generat",
  "draw",
  "paint",
  "create",
  "make",
  "design",
  "illustrate",
  "нарисуй",
  "нарисуйте",
  "сгенерируй",
  "создай",
]);

function hasWord(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function tokenize(text: string) {
  return text
    .split(/\s+/)
    .map((token) => token.replace(/[.,!?;:«»"'`()\[\]-]+/g, "").toLowerCase())
    .filter((token) => token.length > 0);
}

const DRAW_TOKENS = new Set([
  "chiz",
  "chizib",
  "chizing",
  "chizish",
  "chizmoq",
  "chizaman",
  "chizamiz",
  "chizadi",
  "chizilgan",
  "draw",
  "draws",
  "drawing",
  "paint",
  "paints",
  "painting",
  "sketch",
  "illustrate",
  "нарисуй",
  "нарисуйте",
  "нарисуешь",
]);

/**
 * Foydalanuvchi xabarida rasm generatsiyasi so'ralganini aniqlaydi.
 */
export function isImageRequest(text: string): boolean {
  const value = text.toLowerCase().trim();
  if (tokenize(text).some((token) => DRAW_TOKENS.has(token))) return true;

  const wantsSubject = hasWord(value, SUBJECT_WORDS);
  const wantsAction = hasWord(value, ACTION_WORDS);
  return wantsSubject && wantsAction;
}

function isCommandToken(token: string) {
  const value = token.toLowerCase();
  if (CLEANUP_WORDS.has(value)) return true;
  return GENERIC_SUBJECT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * Buyruq so'zlarini olib tashlab, toza prompt qaytaradi (fallback uchun).
 */
export function extractImagePrompt(text: string): string {
  const cleaned = tokenize(text)
    .filter((token) => !isCommandToken(token))
    .join(" ")
    .trim();

  return cleaned.length >= 2 ? cleaned : text.trim();
}

// ---------------------------------------------------------------------------
// Promptni boyitish (Gemini matn modeli orqali, bepul)
// ---------------------------------------------------------------------------

async function geminiGenerateText(
  model: string,
  prompt: string,
  system: string,
  signal?: AbortSignal
): Promise<string | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;

  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join(" ")
      .trim();
    return text && text.length > 2 ? text : null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return null;
  }
}

export async function enhanceImagePrompt(
  userText: string,
  signal?: AbortSignal
): Promise<string> {
  const model =
    process.env.GEMINI_IMAGE_PROMPT_MODEL?.trim() || "gemini-3.1-flash-lite";
  const enhanced = await geminiGenerateText(
    model,
    userText,
    IMAGE_PROMPT_SYSTEM,
    signal
  ).catch(() => null);

  if (enhanced) {
    return enhanced.replace(/^["'`\s]+|["'`\s]+$/g, "").slice(0, 900);
  }
  return extractImagePrompt(userText);
}

// ---------------------------------------------------------------------------
// Gemini image generation
// ---------------------------------------------------------------------------

interface GeneratedBytes {
  data: Uint8Array;
  mimeType: string;
}

async function generateViaGemini(
  prompt: string,
  signal?: AbortSignal
): Promise<GeneratedBytes | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;

  for (const model of GEMINI_IMAGE_MODELS) {
    const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      continue;
    }

    if (res.status === 404) continue; // model mavjud emas — keyingisini sinaymiz
    if (!res.ok) return null; // 429/403 (billing yo'q) — Pollinations'ga qaytamiz

    const json = (await res.json()) as {
      candidates?: {
        content?: {
          parts?: { inlineData?: { data?: string; mimeType?: string } }[];
        };
      }[];
    };
    const part = json.candidates?.[0]?.content?.parts?.find(
      (item) => item.inlineData?.data
    );
    if (part?.inlineData?.data) {
      return {
        data: Buffer.from(part.inlineData.data, "base64"),
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pollinations (bepul, anonim) — 402 bo'lsa kutib qayta urinadi
// ---------------------------------------------------------------------------

function getPollinationsModel() {
  return process.env.POLLINATIONS_MODEL?.trim() || "sana";
}

function buildPollinationsUrl(prompt: string, seed: number) {
  const { width, height } = getImageSize();
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: getPollinationsModel(),
  });
  const token = process.env.POLLINATIONS_TOKEN?.trim();
  if (token) {
    params.set("token", token);
    params.set("nologo", "true");
  }
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

async function generateViaPollinations(
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = buildPollinationsUrl(prompt, seed);
  const maxAttempts = 3;
  let lastError = "Rasm generatsiya qilishda xatolik yuz berdi";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        signal,
        cache: "no-store",
        headers: { Accept: "image/*" },
      });

      if (res.ok && res.body) {
        await res.arrayBuffer().catch(() => undefined);
        return url;
      }

      if (res.status === 402) {
        lastError =
          "Rasm xizmati band (bepul limit). Iltimos, birozdan so'ng qayta urinib ko'ring.";
        if (attempt < maxAttempts) await sleep(16_000);
        continue;
      }

      lastError = `Rasm xizmati xatosi (${res.status})`;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      lastError = "Rasm xizmatiga ulanib bo'lmadi";
    }

    if (attempt < maxAttempts) await sleep(1500 * attempt);
  }

  throw new Error(lastError);
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

/**
 * Rasmni generatsiya qiladi. Avval Gemini (aniqroq, billing kerak), aks holda
 * Pollinations (bepul) ishlatiladi. Gemini rasmi bazaga saqlanadi va
 * ichki URL orqali beriladi.
 */
export async function generateImage(
  userId: string,
  prompt: string,
  signal?: AbortSignal
): Promise<GeneratedImage> {
  if (!isImageGenerationConfigured()) {
    throw new Error("Rasm generatsiyasi o'chirilgan (AI_IMAGE_DISABLED=1)");
  }

  const clean = await enhanceImagePrompt(prompt, signal);
  const provider = getImageProvider();

  if (provider !== "pollinations") {
    const image = await generateViaGemini(clean, signal);
    if (image) {
      const saved = await prisma.generatedImage.create({
        data: {
          userId,
          mimeType: image.mimeType,
          data: new Uint8Array(image.data),
          prompt: clean,
          provider: "gemini",
        },
        select: { id: true },
      });
      return { url: `/api/ai/image/${saved.id}`, prompt: clean };
    }
    if (provider === "gemini") {
      throw new Error(
        "Gemini rasm generatsiyasi ishlamadi. Google Cloud'da billing yoqilganini tekshiring."
      );
    }
  }

  const url = await generateViaPollinations(clean, signal);
  return { url, prompt: clean };
}
