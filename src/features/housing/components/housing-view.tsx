"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, List, LocateFixed, Map as MapIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/features/housing/actions";
import type { ListingCardData } from "@/features/housing/queries";
import { ListingCard } from "@/features/housing/components/listing-card";
import HousingMap from "@/features/housing/components/housing-map";

interface Props {
  listings: ListingCardData[];
  filters: React.ReactNode;
  saved: boolean;
  location: { lat: number; lng: number } | null;
}

export function HousingView({ listings, filters, saved, location }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [mobileView, setMobileView] = React.useState<"list" | "map">("list");
  const [locating, setLocating] = React.useState(false);
  const [favOverride, setFavOverride] = React.useState<Record<string, boolean>>({});
  const [favPending, setFavPending] = React.useState<string | null>(null);
  const isFavorite = (listing: ListingCardData) => favOverride[listing.id] ?? listing.isFavorite;
  const filtered = saved ? listings.filter(isFavorite) : listings;

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lat", String(position.coords.latitude));
      params.set("lng", String(position.coords.longitude));
      params.set("sort", "distance");
      params.delete("page");
      router.push("/housing?" + params.toString());
      setLocating(false);
      toast.success("Joylashuvingiz aniqlandi");
    }, () => {
      setLocating(false);
      toast.error("Joylashuvni aniqlab bo'lmadi");
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  async function onToggleFavorite(listing: ListingCardData) {
    setFavPending(listing.id);
    const result = await toggleFavorite(listing.id);
    setFavPending(null);
    if (!result.success) { toast.error(result.error); return; }
    setFavOverride((prev) => ({ ...prev, [listing.id]: result.data.favorite }));
    toast.success(result.data.favorite ? "Saqlandi" : "Saqlanganlardan olindi");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Kvartiralar" description="Talabalar uchun ijara uy-joylar. Xaritada qidiring va to'g'ridan bog'laning.">
        <Button asChild><Link href="/housing/new"><Plus className="size-4" /> E'lon berish</Link></Button>
      </PageHeader>
      {filters}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant={location ? "secondary" : "outline"} onClick={locate} disabled={locating}><LocateFixed className="size-4" /> Yaqinimda</Button>
        <div className="inline-flex rounded-lg border border-border p-1 lg:hidden">
          <Button variant={mobileView === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setMobileView("list")}><List className="size-4" /> Ro&apos;yxat</Button>
          <Button variant={mobileView === "map" ? "secondary" : "ghost"} size="sm" onClick={() => setMobileView("map")}><MapIcon className="size-4" /> Xarita</Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title={saved ? "Saqlangan e'lonlar yo'q" : "E'lonlar topilmadi"} description="Qidiruv va filtrlarni o'zgartirib ko'ring." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={cn("space-y-3", mobileView === "map" && "hidden lg:block")}>
            <p className="text-sm text-muted-foreground">Bu sahifada {filtered.length} ta e&apos;lon. Xarita ham shu sahifadagi e&apos;lonlarni ko&apos;rsatadi.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filtered.map((listing) => <ListingCard key={listing.id} listing={{ ...listing, isFavorite: isFavorite(listing) }} active={activeId === listing.id} favoritePending={favPending === listing.id} onSelect={setActiveId} onToggleFavorite={onToggleFavorite} />)}
            </div>
          </div>
          <div className={cn("lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]", mobileView === "list" && "hidden lg:block")}>
            <div className="h-[65vh] overflow-hidden rounded-xl border border-border lg:h-full">
              <HousingMap listings={filtered.map((listing) => ({ id: listing.id, lat: listing.lat, lng: listing.lng, title: listing.title, price: listing.price, currency: listing.currency }))} activeId={activeId} onSelect={setActiveId} userLocation={location} className="h-full w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
