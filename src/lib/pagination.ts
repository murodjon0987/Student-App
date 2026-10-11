export type ListParams = Record<string, string | string[] | undefined>;
export const PAGE_SIZE = 24;

export function param(params: ListParams, name: string, fallback = ""): string {
  const value = params[name];
  return typeof value === "string" ? value.trim().slice(0, 200) : fallback;
}

export function pageNumber(value: unknown): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 1;
}

export function pagination(total: number, value: unknown) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageNumber(value), pageCount);
  return { page, pageCount, total, pageSize: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export type Pagination = ReturnType<typeof pagination>;

export async function queryPage<T>(
  value: unknown,
  count: () => Promise<number>,
  fetch: (range: { skip: number; take: number }) => Promise<T[]>,
) {
  const meta = pagination(await count(), value);
  const items = await fetch({ skip: meta.skip, take: meta.take });
  return { items, pagination: meta };
}

export function pageHref(path: string, params: ListParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  return query.size ? `${path}?${query}` : path;
}
