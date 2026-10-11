import "server-only";
import { setTimeout as delay } from "node:timers/promises";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const DEFAULT_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
];

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  attachment?: { mimeType: string; data: string };
}

export function getAiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
}

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function sleep(ms: number, signal?: AbortSignal) {
  return delay(ms, undefined, { signal });
}

function modelCandidates(): string[] {
  const candidates = [
    getAiModel(),
    process.env.GEMINI_FALLBACK_MODEL?.trim() || "",
    ...DEFAULT_MODELS,
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiStreamChunk {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

function buildRequest(
  model: string,
  apiKey: string,
  system: string,
  messages: AiMessage[],
  signal?: AbortSignal
) {
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(
    model
  )}:streamGenerateContent?alt=sse`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }, ...(m.attachment ? [{ inlineData: m.attachment }] : [])],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });
}

/**
 * Gemini `streamGenerateContent` REST endpointidan SSE oqimini o'qib,
 * matn bo'laklarini async generator sifatida qaytaradi.
 *
 * Bandlik (429/5xx) holatida bir necha marta qayta urinadi va zaxira
 * modellarga o'tadi.
 */
export async function* streamGemini({
  system,
  messages,
  signal,
}: {
  system: string;
  messages: AiMessage[];
  signal?: AbortSignal;
}): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY o'rnatilmagan");
  }

  let response: Response | null = null;
  let lastError = "Gemini bilan bog'lanib bo'lmadi";

  outer: for (const model of modelCandidates()) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      signal?.throwIfAborted();
      let res: Response;
      try {
        res = await buildRequest(model, apiKey, system, messages, signal);
      } catch (error) {
        signal?.throwIfAborted();
        if (error instanceof Error && error.name === "AbortError") throw error;
        lastError = "Gemini serveriga ulanib bo'lmadi";
        await sleep(500 * attempt, signal);
        continue;
      }

      if (res.ok && res.body) {
        response = res;
        break outer;
      }

      const detail = await res.text().catch(() => "");

      if (!RETRY_STATUSES.has(res.status)) {
        // Modelga xos xato (masalan 404) — darhol keyingi modelga o'tamiz.
        lastError = `Gemini xato (${res.status}): ${
          detail.slice(0, 300) || "javob yo'q"
        }`;
        break;
      }

      lastError = `Gemini xato (${res.status}): ${
        detail.slice(0, 300) || "javob yo'q"
      }`;
      if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt, signal);
    }
  }

  if (!response?.body) {
    throw new Error(lastError);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = (done ? `${buffer}\n` : buffer).split("\n");
      buffer = lines.pop() ?? "";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let chunk: GeminiStreamChunk;
        try {
          chunk = JSON.parse(payload) as GeminiStreamChunk;
        } catch {
          continue;
        }

        const blockReason = chunk.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(
            "So'rov xavfsizlik filtri tomonidan bloklandi. Boshqacha ifodalab ko'ring."
          );
        }

        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === "string" && part.text.length > 0) {
            yield part.text;
          }
        }
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}
