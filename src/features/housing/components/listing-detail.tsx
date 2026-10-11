"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronLeft,
  Eye,
  Heart,
  Layers,
  MapPin,
  Maximize,
  Pencil,
  Phone,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { formatHousingPrice } from "@/features/housing/format";
import { deleteListing, toggleFavorite } from "@/features/housing/actions";
import {
  HOUSING_AMENITY_LABELS,
  HOUSING_STATUS_LABELS,
  HOUSING_TYPE_LABELS,
  type HousingAmenity,
  type HousingStatus,
  type HousingType,
} from "@/features/housing/schema";
import type { ListingDetailData } from "@/features/housing/queries";
import HousingMap from "@/features/housing/components/housing-map";

export function ListingDetail({ listing }: { listing: ListingDetailData }) {
  const router = useRouter();
  const [favorite, setFavorite] = React.useState(listing.isFavorite);
  const [favPending, setFavPending] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(0);

  const typeLabel =
    HOUSING_TYPE_LABELS[listing.type as HousingType] ?? listing.type;
  const statusLabel =
    HOUSING_STATUS_LABELS[listing.status as HousingStatus] ?? listing.status;

  async function onToggleFavorite() {
    setFavPending(true);
    const result = await toggleFavorite(listing.id);
    setFavPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setFavorite(result.data.favorite);
    toast.success(result.data.favorite ? "Saqlandi" : "Saqlanganlardan olindi");
  }

  const telegramUrl = listing.telegram
    ? listing.telegram.startsWith("http")
      ? listing.telegram
      : `https://t.me/${listing.telegram.replace(/^@/, "")}`
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/housing"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Kvartiralar
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFavorite}
            disabled={favPending}
          >
            <Heart
              className={cn("size-4", favorite && "fill-rose-500 text-rose-500")}
            />
            {favorite ? "Saqlangan" : "Saqlash"}
          </Button>
          {listing.isMine && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/housing/${listing.id}/edit`}>
                  <Pencil className="size-4" /> Tahrirlash
                </Link>
              </Button>
              <ConfirmDialog
                title="E'lonni o'chirish"
                description="Bu e'lon butunlay o'chiriladi. Amalni qaytarib bo'lmaydi."
                confirmLabel="Ha, o'chirish"
                onConfirm={async () => {
                  const result = await deleteListing(listing.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("E'lon o'chirildi");
                  router.push("/housing");
                  router.refresh();
                }}
                trigger={
                  <Button variant="outline" size="sm">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted sm:col-span-2">
          {listing.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/housing/image/${listing.images[activeImage]}`}
              alt={listing.title}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-muted-foreground">
              <Building2 className="size-10" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white">
            {formatHousingPrice(listing.price, listing.currency)}
          </span>
        </div>

        {listing.images.length > 1 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {listing.images.slice(0, 3).map((imageId, index) => (
              <button
                key={imageId}
                type="button"
                onClick={() => setActiveImage(index)}
                className={cn(
                  "aspect-square overflow-hidden rounded-lg border sm:aspect-[4/3]",
                  activeImage === index
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/housing/image/${imageId}`}
                  alt={`${listing.title} ${index + 1}`}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {listing.images.length > 3 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {listing.images.slice(3).map((imageId, index) => (
            <button
              key={imageId}
              type="button"
              onClick={() => setActiveImage(index + 3)}
              className={cn(
                "aspect-square overflow-hidden rounded-lg border",
                activeImage === index + 3
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/housing/image/${imageId}`}
                alt={`${listing.title} ${index + 4}`}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{typeLabel}</Badge>
              {listing.status !== "ACTIVE" && (
                <Badge variant="secondary">{statusLabel}</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold sm:text-2xl">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {listing.city}
                {listing.district ? `, ${listing.district}` : ""}
                {listing.address ? `, ${listing.address}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-4" />
                {formatDate(listing.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="size-4" />
                {listing.views} ko&apos;rish
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile
              icon={BedDouble}
              label="Xonalar"
              value={`${listing.rooms} ta`}
            />
            <InfoTile
              icon={Maximize}
              label="Maydon"
              value={listing.area ? `${listing.area} m²` : "—"}
            />
            <InfoTile
              icon={Layers}
              label="Qavat"
              value={
                listing.floor
                  ? `${listing.floor}${
                      listing.totalFloors ? `/${listing.totalFloors}` : ""
                    }`
                  : "—"
              }
            />
            <InfoTile
              icon={Building2}
              label="Narx"
              value={formatHousingPrice(listing.price, listing.currency)}
            />
          </div>

          {listing.description && (
            <div className="space-y-2">
              <h2 className="font-semibold">Tavsif</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {listing.description}
              </p>
            </div>
          )}

          {listing.amenities.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold">Qulayliklar</h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium"
                  >
                    {HOUSING_AMENITY_LABELS[amenity as HousingAmenity] ?? amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="font-semibold">Xaritada</h2>
            <div className="h-72 overflow-hidden rounded-xl border border-border">
              <HousingMap
                listings={[
                  {
                    id: listing.id,
                    lat: listing.lat,
                    lng: listing.lng,
                    title: listing.title,
                    price: listing.price,
                    currency: listing.currency,
                  },
                ]}
                center={{ lat: listing.lat, lng: listing.lng }}
                zoom={15}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20">
            <div>
              <p className="text-sm text-muted-foreground">Oylik ijara</p>
              <p className="text-2xl font-bold">
                {formatHousingPrice(listing.price, listing.currency)}
              </p>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-sm font-medium">{listing.ownerName}</p>
              <p className="text-xs text-muted-foreground">E&apos;lon egasi</p>
            </div>

            <div className="space-y-2">
              {listing.phone && (
                <Button asChild className="w-full">
                  <a href={`tel:${listing.phone.replace(/\s+/g, "")}`}>
                    <Phone className="size-4" /> Qo&apos;ng&apos;iroq
                  </a>
                </Button>
              )}
              {telegramUrl && (
                <Button asChild variant="outline" className="w-full">
                  <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                    <Send className="size-4" /> Telegram
                  </a>
                </Button>
              )}
              {!listing.phone && !telegramUrl && (
                <p className="text-xs text-muted-foreground">
                  Aloqa ma&apos;lumoti ko&apos;rsatilmagan.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
