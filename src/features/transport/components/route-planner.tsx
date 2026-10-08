"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownUp,
  Bus,
  Crosshair,
  Loader2,
  MapPin,
  TrainFront,
} from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";import { Input } from "@/components/ui/input";
import { planTrip } from "@/features/transport/actions";
import type { PlannedRoute } from "@/features/transport/planner";
import type { FareItem, StopListItem } from "@/features/transport/queries";

const TransitMap = dynamic(
  () => import("@/features/transport/components/transit-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Xarita yuklanmoqda...
      </div>
    ),
  }
);

interface Props {
  stops: StopListItem[];
  fares: FareItem[];
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function StopPicker({
  label,
  value,
  onSelect,
  stops,
  exclude,
}: {
  label: string;
  value: StopListItem | null;
  onSelect: (stop: StopListItem | null) => void;
  stops: StopListItem[];
  exclude?: string | null;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return stops
      .filter((s) => s.id !== exclude && s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [query, stops, exclude]);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm">
          {value.mode === "METRO" ? (
            <TrainFront className="size-4 text-violet-500" />
          ) : (
            <Bus className="size-4 text-sky-500" />
          )}
          <span className="min-w-0 flex-1 truncate">{value.name}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            o'zgartirish
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Bekat nomini kiriting..."
          />
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              {results.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    onSelect(stop);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {stop.mode === "METRO" ? (
                    <TrainFront className="size-4 shrink-0 text-violet-500" />
                  ) : (
                    <Bus className="size-4 shrink-0 text-sky-500" />
                  )}
                  <span className="truncate">{stop.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RoutePlanner({ stops, fares }: Props) {
  const [from, setFrom] = React.useState<StopListItem | null>(null);
  const [to, setTo] = React.useState<StopListItem | null>(null);
  const [route, setRoute] = React.useState<PlannedRoute | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [locating, setLocating] = React.useState(false);

  const metroFare = fares.find((f) => f.mode === "METRO")?.amount ?? 0;
  const busFare = fares.find((f) => f.mode === "BUS")?.amount ?? 0;

  const routeCoords = React.useMemo(() => {
    if (!route) return [];
    const byId = new Map(stops.map((s) => [s.id, s]));
    const coords: [number, number][] = [];
    for (const leg of route.legs) {
      for (const stop of leg.stops) {
        const item = byId.get(stop.id);
        if (item) coords.push([item.lat, item.lng]);
      }
    }
    return coords;
  }, [route, stops]);

  function locate(target: "from" | "to") {
    if (!("geolocation" in navigator)) {
      toast.error("Brauzer joylashuvni qo'llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest: StopListItem | null = null;
        let best = Infinity;
        for (const stop of stops) {
          const d = haversine(latitude, longitude, stop.lat, stop.lng);
          if (d < best) {
            best = d;
            nearest = stop;
          }
        }
        if (nearest) {
          if (target === "from") setFrom(nearest);
          else setTo(nearest);
        }
        setLocating(false);
      },
      () => {
        toast.error("Joylashuvni aniqlab bo'lmadi");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function build() {
    if (!from || !to) {
      toast.error("Boshlanish va manzilni tanlang");
      return;
    }
    setLoading(true);
    const result = await planTrip(from.id, to.id);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (!result.data.found) {
      toast.error("Bu bekatlar orasida yo'nalish topilmadi");
      setRoute(null);
      return;
    }
    setRoute(result.data);
  }

  let fare = 0;
  if (route) {
    const hasMetro = route.legs.some((l) => l.mode === "METRO");
    const busLegs = route.legs.filter((l) => l.mode === "BUS").length;
    fare = (hasMetro ? metroFare : 0) + busLegs * busFare;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <StopPicker
            label="Qayerdan"
            value={from}
            onSelect={setFrom}
            stops={stops}
            exclude={to?.id}
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setFrom(to);
                setTo(from);
                setRoute(null);
              }}
              aria-label="Almashtirish"
            >
              <ArrowDownUp className="size-4" />
            </Button>
          </div>
          <StopPicker
            label="Qayerga"
            value={to}
            onSelect={setTo}
            stops={stops}
            exclude={from?.id}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => locate("from")}
              disabled={locating}
            >
              <Crosshair className="size-4" /> Joylashuvim (qayerdan)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => locate("to")}
              disabled={locating}
            >
              <Crosshair className="size-4" /> Joylashuvim (qayerga)
            </Button>
          </div>
          <Button type="button" onClick={build} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MapPin className="size-4" />
            )}
            Marshrut qurish
          </Button>
        </div>

        <div className="h-64 overflow-hidden rounded-lg border border-border lg:h-full">
          <TransitMap
            stops={stops.map((s) => ({
              id: s.id,
              name: s.name,
              lat: s.lat,
              lng: s.lng,
              mode: s.mode,
            }))}
            lines={[]}
            showBus={false}
            routeCoords={routeCoords}
            className="h-full w-full"
          />
        </div>
      </div>

      {route && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">
              {route.legs.length} qism, {route.transfers} o'tish
            </span>
            <span className="text-muted-foreground">
              ~{formatDistance(route.totalDistanceMeters)}
            </span>
            {fare > 0 && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Taxminiy narx: {formatCurrency(fare, "UZS")}
              </span>
            )}
          </div>

          <ol className="space-y-3">
            {route.legs.map((leg, index) => (
              <li
                key={`${leg.lineId}-${index}`}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: leg.color }}
                  >
                    {leg.mode === "METRO" ? (
                      <TrainFront className="size-3.5" />
                    ) : (
                      <Bus className="size-3.5" />
                    )}
                    {leg.lineRef}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium break-words">
                    {leg.fromStopName} → {leg.toStopName}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.max(0, leg.stops.length - 1)} bekat ·{" "}
                  {formatDistance(leg.distanceMeters)}
                </p>
                {leg.stops.length > 2 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-primary">
                      Oraliq bekatlar
                    </summary>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {leg.stops.slice(1, -1).map((stop) => (
                        <span
                          key={stop.id}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {stop.name}
                        </span>
                      ))}
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
