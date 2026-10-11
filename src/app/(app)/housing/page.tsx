import type { Metadata } from "next";

import { getListings } from "@/features/housing/queries";
import { HousingView } from "@/features/housing/components/housing-view";
import { ListFilters } from "@/components/shared/list-filters";
import { ListPagination } from "@/components/shared/list-pagination";
import { param, type ListParams } from "@/lib/pagination";
import { HOUSING_TYPES, HOUSING_TYPE_LABELS, HOUSING_AMENITIES, HOUSING_AMENITY_LABELS } from "@/features/housing/schema";

export const metadata: Metadata = { title: "Kvartiralar" };

export default async function HousingPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const result = await getListings(params);
  const lat = Number(param(params, "lat"));
  const lng = Number(param(params, "lng"));
  const location = param(params, "lat") && param(params, "lng") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  return (
    <div className="space-y-6">
      <HousingView listings={result.items} saved={param(params, "tab") === "saved"} location={location}
        filters={<ListFilters key={JSON.stringify(params)} path="/housing" params={params}
          hidden={location ? { lat: String(lat), lng: String(lng) } : {}}
          fields={[
            { name: "tab", label: "E'lonlar", options: [{ value: "", label: "Barchasi" }, { value: "saved", label: "Saqlangan" }] },
            { name: "type", label: "Turi", options: [{ value: "", label: "Barchasi" }, ...HOUSING_TYPES.map((value) => ({ value, label: HOUSING_TYPE_LABELS[value] }))] },
            { name: "rooms", label: "Xonalar", options: [{ value: "", label: "Barchasi" }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 5 ? "5+ xona" : `${n} xona` }))] },
            { name: "city", label: "Shahar", options: [{ value: "", label: "Barchasi" }, ...result.cities.map((value) => ({ value, label: value }))] },
            { name: "min", label: "Narx dan (UZS)", type: "number" },
            { name: "max", label: "Narx gacha (UZS)", type: "number" },
            { name: "amenity", label: "Qulayliklar (bir nechtasini tanlash mumkin)", multiple: true, options: HOUSING_AMENITIES.map((value) => ({ value, label: HOUSING_AMENITY_LABELS[value] })) },
            { name: "sort", label: "Saralash", defaultValue: "new", options: [{ value: "new", label: "Yangi" }, { value: "price-asc", label: "Arzon narx" }, { value: "price-desc", label: "Qimmat narx" }, ...(location ? [{ value: "distance", label: "Yaqin (masofa)" }] : [])] },
          ]}
        />}
      />
      <ListPagination meta={result.pagination} path="/housing" params={params} />
    </div>
  );
}
