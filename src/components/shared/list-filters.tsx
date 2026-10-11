import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { param, type ListParams } from "@/lib/pagination";

export type FilterField = {
  name: string;
  label: string;
  options?: { value: string; label: string }[];
  type?: "number";
  defaultValue?: string;
  multiple?: boolean;
};

function multipleValues(params: ListParams, name: string): string[] {
  const value = params[name];
  return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
}

export function ListFilters({ path, params, fields = [], searchLabel = "Qidirish", hidden = {} }: {
  path: string;
  params: ListParams;
  fields?: FilterField[];
  searchLabel?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={path} method="get" className="grid grid-cols-2 items-end gap-3 rounded-xl border border-border bg-card p-3 sm:flex sm:flex-wrap">
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <label className="col-span-2 min-w-0 flex-1 space-y-1 text-xs text-muted-foreground sm:min-w-48">
        {searchLabel}
        <Input name="q" defaultValue={param(params, "q")} maxLength={200} placeholder="Qidirish..." />
      </label>
      {fields.map((field) => (
        <label key={field.name} className="min-w-0 space-y-1 text-xs text-muted-foreground sm:min-w-28">
          {field.label}
          {field.options ? (
            <select name={field.name} multiple={field.multiple} defaultValue={field.multiple ? multipleValues(params, field.name) : param(params, field.name, field.defaultValue ?? "")} className="flex min-h-11 min-w-0 w-full rounded-md border border-input bg-background px-2 text-base text-foreground sm:min-h-9 sm:px-3 sm:text-sm">
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : <Input name={field.name} type={field.type ?? "text"} defaultValue={param(params, field.name)} min={field.type === "number" ? 0 : undefined} />}
        </label>
      ))}
      <Button type="submit" size="sm">Qo&apos;llash</Button>
      <Button variant="ghost" size="sm" asChild><Link href={path}>Tozalash</Link></Button>
    </form>
  );
}
