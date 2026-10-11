/** Older chat messages may contain provider URLs written before server-side storage. */
export function redactProviderTokens(content: string) {
  return content.replace(/https:\/\/(?:image|gen)\.pollinations\.ai\/[^\s)<>]+/gi, (value) => {
    try {
      const url = new URL(value);
      for (const key of ["token", "key", "api_key"]) url.searchParams.delete(key);
      return url.toString();
    } catch {
      return "[rasm havolasi yaroqsiz]";
    }
  });
}
