import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pageHref, type ListParams, type Pagination } from "@/lib/pagination";

export function ListPagination({ meta, path, params }: { meta: Pagination; path: string; params: ListParams }) {
  if (meta.total === 0) return null;
  return (
    <nav aria-label="Sahifalar" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <p className="text-sm text-muted-foreground">
        {meta.skip + 1}–{Math.min(meta.skip + meta.pageSize, meta.total)} / {meta.total} ta · {meta.page}/{meta.pageCount} sahifa
      </p>
      <div className="flex gap-2">
        {meta.page > 1 ? (
          <Button variant="outline" size="sm" asChild><Link href={pageHref(path, params, meta.page - 1)}>Oldingi</Link></Button>
        ) : <Button variant="outline" size="sm" disabled>Oldingi</Button>}
        {meta.page < meta.pageCount ? (
          <Button variant="outline" size="sm" asChild><Link href={pageHref(path, params, meta.page + 1)}>Keyingi</Link></Button>
        ) : <Button variant="outline" size="sm" disabled>Keyingi</Button>}
      </div>
    </nav>
  );
}
