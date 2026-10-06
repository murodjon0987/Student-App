"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Bus,
  Info,
  MapPin,
  Route as RouteIcon,
  Search,
  TrainFront,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import type {
  FareItem,
  LineListItem,
  StopListItem,
} from "@/features/transport/queries";
import { RoutePlanner } from "@/features/transport/components/route-planner";

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
  lines: LineListItem[];
  fares: FareItem[];
}

type Tab = "metro" | "bus" | "route";

function StopThumb({
  stop,
  className,
}: {
  stop: StopListItem;
  className?: string;
}) {
  if (stop.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={stop.imageUrl}
        alt={stop.name}
        loading="lazy"
        className={cn("size-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white/90",
        className
      )}
    >
      {stop.mode === "METRO" ? (
        <TrainFront className="size-7" />
      ) : (
        <Bus className="size-7" />
      )}
    </div>
  );
}

function LineBadge({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

export function TransportView({ stops, lines, fares }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("metro");
  const [search, setSearch] = React.useState("");

  const metroStops = React.useMemo(
    () => stops.filter((s) => s.mode === "METRO"),
    [stops]
  );
  const busStops = React.useMemo(
    () => stops.filter((s) => s.mode === "BUS"),
    [stops]
  );

  const linesByStop = React.useMemo(() => {
    const map = new Map<string, { color: string; ref: string; mode: string }[]>();
    for (const line of lines) {
      for (const stopId of line.stopIds) {
        const list = map.get(stopId) ?? [];
        list.push({ color: line.color, ref: line.ref, mode: line.mode });
        map.set(stopId, list);
      }
    }
    return map;
  }, [lines]);

  const metroFare = fares.find((f) => f.mode === "METRO");
  const busFare = fares.find((f) => f.mode === "BUS");

  const filteredBus = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? busStops.filter((s) => s.name.toLowerCase().includes(q))
      : busStops;
    return base.slice(0, 120);
  }, [busStops, search]);

  const filteredMetro = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? metroStops.filter((s) => s.name.toLowerCase().includes(q))
      : metroStops;
  }, [metroStops, search]);

  const mapStops = React.useMemo(
    () =>
      stops.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        mode: s.mode,
        color: linesByStop.get(s.id)?.[0]?.color,
      })),
    [stops, linesByStop]
  );

  const mapLines = React.useMemo(
    () =>
      lines
        .filter((l) => l.geometry && l.geometry.length > 1)
        .map((l) => ({
          id: l.id,
          color: l.color,
          mode: l.mode,
          geometry: l.geometry as [number, number][],
        })),
    [lines]
  );

  const tabs: { id: Tab; label: string; icon: typeof TrainFront }[] = [
    { id: "metro", label: "Metro", icon: TrainFront },
    { id: "bus", label: "Avtobus", icon: Bus },
    { id: "route", label: "Marshrut", icon: RouteIcon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport"
        description="Toshkent metro va avtobus bekati: rasmlar, joylashuv, narxlar va marshrut."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSearch("");
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-80 overflow-hidden rounded-xl border border-border sm:h-96">
        <TransitMap
          stops={mapStops}
          lines={mapLines}
          showBus={tab === "bus"}
          onSelectStop={(id) => router.push(`/transport/stop/${id}`)}
          className="h-full w-full"
        />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="size-3.5" />
        Ma'lumotlar: OpenStreetMap (ODbL) va Wikimedia Commons (CC BY-SA)
      </p>

      {tab === "route" ? (
        <RoutePlanner stops={stops} fares={fares} />
      ) : tab === "metro" ? (
        <div className="space-y-4">
          <FareCard fare={metroFare} fallbackLabel="Metro" />
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bekat nomini qidirish..."
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMetro.map((stop) => (
              <StopCard
                key={stop.id}
                stop={stop}
                lines={linesByStop.get(stop.id) ?? []}
              />
            ))}
          </div>
          {filteredMetro.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Bekat topilmadi.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FareCard fare={busFare} fallbackLabel="Avtobus" />
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bekat nomini qidirish..."
              className="pl-9"
            />
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {filteredBus.map((stop) => (
              <Link
                key={stop.id}
                href={`/transport/stop/${stop.id}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <Bus className="size-4 shrink-0 text-sky-500" />
                <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            {filteredBus.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Bekat topilmadi.
              </p>
            )}
          </div>
          {busStops.length > filteredBus.length && (
            <p className="text-center text-xs text-muted-foreground">
              {filteredBus.length} / {busStops.length} ko'rsatilmoqda — aniqroq
              qidiring.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FareCard({
  fare,
  fallbackLabel,
}: {
  fare?: FareItem;
  fallbackLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <TrainFront className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{fallbackLabel} yo'l haqi</p>
        <p className="text-lg font-bold">
          {fare ? formatCurrency(fare.amount, fare.currency) : "—"}
        </p>
        {fare?.note && (
          <p className="text-xs text-muted-foreground">{fare.note}</p>
        )}
      </div>
    </div>
  );
}

function StopCard({
  stop,
  lines,
}: {
  stop: StopListItem;
  lines: { color: string; ref: string; mode: string }[];
}) {
  return (
    <Link
      href={`/transport/stop/${stop.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="h-36 w-full overflow-hidden">
        <StopThumb stop={stop} className="transition-transform group-hover:scale-105" />
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate font-medium">{stop.nameUz ?? stop.name}</p>
        <div className="flex flex-wrap gap-1.5">
          {lines.slice(0, 4).map((line) => (
            <LineBadge
              key={`${line.mode}-${line.ref}`}
              color={line.color}
              label={line.ref}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
