"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  List,
  LocateFixed,
  Map as MapIcon,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/features/housing/actions";
import {
  HOUSING_AMENITIES,
  HOUSING_AMENITY_LABELS,
  HOUSING_TYPES,
  HOUSING_TYPE_LABELS,
} from "@/features/housing/schema";
import type { ListingCardData } from "@/features/housing/queries";
import { ListingCard } from "@/features/housing/components/listing-card";
import HousingMap from "@/features/housing/components/housing-map";

interface Props {
  listings: ListingCardData[];
}

type SortKey = "new" | "price-asc" | "price-desc" | "distance";

const USD_RATE = 12_600;

function toUzs(listing: ListingCardData) {
  return listing.currency === "USD" ? listing.price * USD_RATE : listing.price;
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function HousingView({ listings }: Props) {
  const [tab, setTab] = React.useState<"all" | "saved">("all");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ANY");
  const [roomsFilter, setRoomsFilter] = React.useState("ANY");
  const [cityFilter, setCityFilter] = React.useState("ANY");
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [amenityFilter, setAmenityFilter] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<SortKey>("new");
  const [showFilters, setShowFilters] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [mobileView, setMobileView] = React.useState<"list" | "map">("list");
  const [userLocation, setUserLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [favOverride, setFavOverride] = React.useState<Record<string, boolean>>(
    {}
  );
  const [favPending, setFavPending] = React.useState<string | null>(null);

  const isFavorite = (listing: ListingCardData) =>
    favOverride[listing.id] ?? listing.isFavorite;

  const cities = React.useMemo(() => {
    const set = new Set(listings.map((listing) => listing.city));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : Infinity;

    const result = listings
      .filter((listing) =>
        tab === "saved"
          ? (favOverride[listing.id] ?? listing.isFavorite)
          : true
      )
      .filter((listing) =>
        typeFilter === "ANY" ? true : listing.type === typeFilter
      )
      .filter((listing) => {
        if (roomsFilter === "ANY") return true;
        if (roomsFilter === "5") return listing.rooms >= 5;
        return listing.rooms === Number(roomsFilter);
      })
      .filter((listing) =>
        cityFilter === "ANY" ? true : listing.city === cityFilter
      )
      .filter((listing) => {
        const value = toUzs(listing);
        return value >= min && value <= max;
      })
      .filter((listing) =>
        amenityFilter.every((amenity) =>
          listing.amenities.includes(amenity)
        )
      )
      .filter((listing) =>
        query
          ? [listing.title, listing.city, listing.district, listing.address]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(query))
          : true
      );

    result.sort((a, b) => {
      if (sort === "price-asc") return toUzs(a) - toUzs(b);
      if (sort === "price-desc") return toUzs(b) - toUzs(a);
      if (sort === "distance" && userLocation) {
        return (
          distanceKm(userLocation, a) - distanceKm(userLocation, b)
        );
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [
    listings,
    tab,
    search,
    typeFilter,
    roomsFilter,
    cityFilter,
    minPrice,
    maxPrice,
    amenityFilter,
    sort,
    userLocation,
    favOverride,
  ]);

  function toggleAmenity(amenity: string) {
    setAmenityFilter((prev) =>
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity]
    );
  }

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSort("distance");
        setLocating(false);
        toast.success("Joylashuvingiz aniqlandi");
      },
      () => {
        setLocating(false);
        toast.error("Joylashuvni aniqlab bo'lmadi");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function onToggleFavorite(listing: ListingCardData) {
    setFavPending(listing.id);
    const result = await toggleFavorite(listing.id);
    setFavPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setFavOverride((prev) => ({ ...prev, [listing.id]: result.data.favorite }));
    toast.success(result.data.favorite ? "Saqlandi" : "Saqlanganlardan olindi");
  }

  const mapListings = filtered.map((listing) => ({
    id: listing.id,
    lat: listing.lat,
    lng: listing.lng,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
  }));

  const activeFilterCount =
    (typeFilter !== "ANY" ? 1 : 0) +
    (roomsFilter !== "ANY" ? 1 : 0) +
    (cityFilter !== "ANY" ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    amenityFilter.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kvartiralar"
        description="Talabalar uchun ijara uy-joylar. Xaritada qidiring va to'g'ridan bog'laning."
      >
        <Button asChild>
          <Link href="/housing/new">
            <Plus className="size-4" /> E'lon berish
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Barchasi
          </button>
          <button
            type="button"
            onClick={() => setTab("saved")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "saved"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Saqlangan
          </button>
        </div>

        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Qidirish: nom, tuman, manzil..."
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          <SlidersHorizontal className="size-4" />
          Filtrlar
          {activeFilterCount > 0 && (
            <Badge className="ml-1">{activeFilterCount}</Badge>
          )}
        </Button>

        <Button
          variant={userLocation ? "secondary" : "outline"}
          onClick={locate}
          disabled={locating}
        >
          <LocateFixed className="size-4" />
          Yaqinimda
        </Button>

        <div className="inline-flex rounded-lg border border-border p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm",
              mobileView === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <List className="size-4" /> Ro&apos;yxat
          </button>
          <button
            type="button"
            onClick={() => setMobileView("map")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm",
              mobileView === "map"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <MapIcon className="size-4" /> Xarita
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Turi</p>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Barchasi</SelectItem>
                  {HOUSING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {HOUSING_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Xonalar</p>
              <Select value={roomsFilter} onValueChange={setRoomsFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Barchasi</SelectItem>
                  <SelectItem value="1">1 xona</SelectItem>
                  <SelectItem value="2">2 xona</SelectItem>
                  <SelectItem value="3">3 xona</SelectItem>
                  <SelectItem value="4">4 xona</SelectItem>
                  <SelectItem value="5">5+ xona</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Shahar</p>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Barchasi</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Saralash
              </p>
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Yangi</SelectItem>
                  <SelectItem value="price-asc">Arzon narx</SelectItem>
                  <SelectItem value="price-desc">Qimmat narx</SelectItem>
                  <SelectItem value="distance">Yaqin (masofa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Narx (so&apos;m)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="dan"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="gacha"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Qulayliklar
            </p>
            <div className="flex flex-wrap gap-2">
              {HOUSING_AMENITIES.map((amenity) => {
                const active = amenityFilter.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {HOUSING_AMENITY_LABELS[amenity]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter("ANY");
                setRoomsFilter("ANY");
                setCityFilter("ANY");
                setMinPrice("");
                setMaxPrice("");
                setAmenityFilter([]);
              }}
            >
              Tozalash
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={
            tab === "saved"
              ? "Saqlangan e'lonlar yo'q"
              : "Hozircha e'lonlar yo'q"
          }
          description={
            tab === "saved"
              ? "Yoqqan kvartiralarni yurakcha bilan saqlab qo'ying."
              : "Birinchi bo'lib kvartira e'loni joylashtiring."
          }
          action={
            tab === "all" ? (
              <Button asChild>
                <Link href="/housing/new">
                  <Plus className="size-4" /> E'lon berish
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div
            className={cn(
              "space-y-3",
              mobileView === "map" && "hidden lg:block"
            )}
          >
            <p className="text-sm text-muted-foreground">
              {filtered.length} ta e&apos;lon topildi
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filtered.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={{
                    ...listing,
                    isFavorite: isFavorite(listing),
                  }}
                  active={activeId === listing.id}
                  favoritePending={favPending === listing.id}
                  onSelect={setActiveId}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </div>

          <div
            className={cn(
              "lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]",
              mobileView === "list" && "hidden lg:block"
            )}
          >
            <div className="h-[65vh] overflow-hidden rounded-xl border border-border lg:h-full">
              <HousingMap
                listings={mapListings}
                activeId={activeId}
                onSelect={setActiveId}
                userLocation={userLocation}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
