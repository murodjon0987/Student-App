import "server-only";

function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const configuredUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!apiKey || !from || !configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    if (url.username || url.password) return null;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && url.protocol === "http:")) {
      return null;
    }
    return { apiKey, from, origin: url.origin };
  } catch {
    return null;
  }
}

export function isResetEmailConfigured() {
  return emailConfiguration() !== null;
}

export async function sendPasswordResetEmail(email: string, token: string, tokenId: string) {
  const config = emailConfiguration();
  if (!config) throw new Error("Password reset email is not configured");
  const url = new URL("/reset-password", config.origin);
  url.searchParams.set("token", token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `password-reset/${tokenId}`,
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: "Student App — parolni tiklash",
      text: `Parolingizni tiklash uchun havolani oching:\n\n${url.toString()}\n\nHavola 1 soat amal qiladi. Agar bu so'rovni siz yubormagan bo'lsangiz, emailni e'tiborsiz qoldiring.`,
    }),
  });
  if (!response.ok) throw new Error(`Password reset delivery failed (${response.status})`);
}
