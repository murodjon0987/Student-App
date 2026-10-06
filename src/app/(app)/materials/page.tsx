import type { Metadata } from "next";

import { getMaterials } from "@/features/materials/queries";
import { getSubjects } from "@/features/schedule/queries";
import { MaterialsView } from "@/features/materials/components/materials-view";

export const metadata: Metadata = { title: "Materiallar" };

export default async function MaterialsPage() {
  const [materials, subjects] = await Promise.all([
    getMaterials(),
    getSubjects(),
  ]);

  return (
    <MaterialsView
      materials={materials}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
