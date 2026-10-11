import { createHash } from "node:crypto";

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Resolve only application paths, never protocol-relative or external URLs. */
export function safeNextPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const base = new URL("https://student-app.invalid");
    const url = new URL(value, base);
    if (url.origin !== base.origin) return fallback;
    if (["/login", "/register", "/forgot-password", "/reset-password"].includes(url.pathname)) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
