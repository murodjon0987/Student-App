import "server-only";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const DEFAULT_MODEL = "flux";
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isImageGenerationConfigured() {
  return process.env.AI_IMAGE_DISABLED !== "1";
}

function getImageModel() {
  return process.env.POLLINATIONS_MODEL?.trim() || DEFAULT_MODEL;
}

function getImageSize() {
  const width = Number(process.env.POLLINATIONS_IMAGE_WIDTH) || DEFAULT_WIDTH;
  const height = Number(process.env.POLLINATIONS_IMAGE_HEIGHT) || DEFAULT_HEIGHT;
  return {
    width: Math.min(Math.max(width, 256), 2048),
    height: Math.min(Math.max(height, 256), 2048),
  };
}

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

// Rasm chizishni aniq bildiruvchi so'zlar (o'zi yetarli, qo'shimcha
// "rasm/surat" so'zi shart emas).
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
 * Rasm haqida gapirib, uni tahlil qilishni so'rash (masalan "rasmdagi
 * narsani tushuntir") generatsiya deb hisoblanmaydi.
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
 * So'rovdan buyruq so'zlarini olib tashlab, rasm uchun toza prompt qaytaradi.
 * Natija juda qisqa bo'lsa, asl matn ishlatiladi.
 */
export function extractImagePrompt(text: string): string {
  const cleaned = tokenize(text)
    .filter((token) => !isCommandToken(token))
    .join(" ")
    .trim();

  return cleaned.length >= 2 ? cleaned : text.trim();
}

export function buildImageUrl(prompt: string, seed: number) {
  const { width, height } = getImageSize();
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: getImageModel(),
    nologo: "true",
  });
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

async function warmImage(url: string, signal?: AbortSignal) {
  let lastError = "Rasm generatsiya qilishda xatolik yuz berdi";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        signal,
        cache: "no-store",
        headers: { Accept: "image/*" },
      });

      if (res.ok && res.body) {
        await res.arrayBuffer().catch(() => undefined);
        return;
      }

      lastError = `Rasm xizmati xatosi (${res.status})`;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      lastError = "Rasm xizmatiga ulanib bo'lmadi";
    }

    if (attempt < MAX_ATTEMPTS) await sleep(700 * attempt);
  }

  throw new Error(lastError);
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

/**
 * Pollinations orqali rasm generatsiya qiladi. Rasmni server tomonda
 * oldindan yuklab, keshga tushiradi va keyin brauzer uchun URL qaytaradi.
 */
export async function generateImage(
  prompt: string,
  signal?: AbortSignal
): Promise<GeneratedImage> {
  if (!isImageGenerationConfigured()) {
    throw new Error("Rasm generatsiyasi o'chirilgan (AI_IMAGE_DISABLED=1)");
  }

  const clean = extractImagePrompt(prompt);
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = buildImageUrl(clean, seed);

  await warmImage(url, signal);

  return { url, prompt: clean };
}
