import type { Metadata } from "next";
import { getMaterials } from "@/features/materials/queries";
import { getSubjects } from "@/features/schedule/queries";
import { MaterialsView } from "@/features/materials/components/materials-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import type { ListParams } from "@/lib/pagination";
import { MATERIAL_CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Materiallar" };

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const [result, subjects] = await Promise.all([getMaterials(params), getSubjects()]);
  return (
    <div className="space-y-6">
      <MaterialsView
        materials={result.items}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        filters={<ListFilters key={JSON.stringify(params)} path="/materials" params={params} fields={[{ name: "category", label: "Kategoriya", options: [{ value: "", label: "Barchasi" }, ...MATERIAL_CATEGORIES] }]} />}
      />
      <ListPagination meta={result.pagination} path="/materials" params={params} />
    </div>
  );
}
