"use client";

import Link from "next/link";
import { BedDouble, Building2, Heart, MapPin, Maximize } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatHousingPrice } from "@/features/housing/format";
import {
  HOUSING_STATUS_LABELS,
  HOUSING_TYPE_LABELS,
  type HousingStatus,
  type HousingType,
} from "@/features/housing/schema";
import type { ListingCardData } from "@/features/housing/queries";

interface Props {
  listing: ListingCardData;
  active?: boolean;
  favoritePending?: boolean;
  onSelect?: (id: string) => void;
  onToggleFavorite?: (listing: ListingCardData) => void;
}

export function ListingCard({
  listing,
  active,
  favoritePending,
  onSelect,
  onToggleFavorite,
}: Props) {
  const typeLabel =
    HOUSING_TYPE_LABELS[listing.type as HousingType] ?? listing.type;

  return (
    <Link
      href={`/housing/${listing.id}`}
      onMouseEnter={() => onSelect?.(listing.id)}
      className={cn(
        "group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40",
        active && "border-primary ring-2 ring-primary/25"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {listing.imageId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/housing/image/${listing.imageId}`}
            alt={listing.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-muted-foreground">
            <Building2 className="size-8" />
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
          {formatHousingPrice(listing.price, listing.currency)}
        </span>

        {listing.status !== "ACTIVE" && (
          <span className="absolute bottom-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            {HOUSING_STATUS_LABELS[listing.status as HousingStatus] ??
              listing.status}
          </span>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            disabled={favoritePending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(listing);
            }}
            aria-label="Saqlash"
            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <Heart
              className={cn(
                "size-4",
                listing.isFavorite && "fill-rose-500 text-rose-500"
              )}
            />
          </button>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <p className="line-clamp-1 font-medium">{listing.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {typeLabel}
          </span>
          <span className="flex items-center gap-1">
            <BedDouble className="size-3.5" />
            {listing.rooms} xona
          </span>
          {listing.area ? (
            <span className="flex items-center gap-1">
              <Maximize className="size-3.5" />
              {listing.area} m²
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {listing.city}
            {listing.district ? `, ${listing.district}` : ""}
          </span>
        </p>
      </div>
    </Link>
  );
}
