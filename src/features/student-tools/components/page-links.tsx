import Link from "next/link";
export function PageLinks({ path, page, total, params = {} }: { path: string; page: number; total: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / 24));
  function href(number: number) { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); query.set("page", String(number)); return `${path}?${query}`; }
  return <nav className="flex items-center justify-between text-sm" aria-label="Sahifalar">{page > 1 ? <Link className="text-primary hover:underline" href={href(page - 1)}>← Oldingi</Link> : <span />}<span className="text-muted-foreground">{page}/{pages} · {total} ta</span>{page < pages ? <Link className="text-primary hover:underline" href={href(page + 1)}>Keyingi →</Link> : <span />}</nav>;
}
