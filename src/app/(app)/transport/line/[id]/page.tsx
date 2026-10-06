import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bus, MapPin, TrainFront } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { getFares, getLineDetail } from "@/features/transport/queries";
import { MapEmbed } from "@/features/transport/components/map-embed";

export const metadata: Metadata = { title: "Liniya" };

export default async function LinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [line, fares] = await Promise.all([getLineDetail(id), getFares()]);
  if (!line) notFound();

  const fare = fares.find((f) => f.mode === line.mode);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/transport"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Transport
      </Link>

      <div
        className="rounded-xl p-5 text-white"
        style={{ backgroundColor: line.color }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
          {line.mode === "METRO" ? (
            <TrainFront className="size-3.5" />
          ) : (
            <Bus className="size-3.5" />
          )}
          {line.mode === "METRO" ? "Metro liniyasi" : "Avtobus yo'nalishi"}
        </span>
        <h1 className="mt-2 text-2xl font-bold">
          {line.ref} · {line.nameUz ?? line.name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/90">
          <span>{line.stops.length} bekat</span>
          {line.operator && <span>{line.operator}</span>}
          {fare && (
            <span>{formatCurrency(fare.amount, fare.currency)} (taxminiy)</span>
          )}
        </div>
      </div>

      <div className="h-72 overflow-hidden rounded-xl border border-border">
        <MapEmbed
          stops={line.stops.map((stop) => ({
            id: stop.id,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            mode: line.mode,
            color: line.color,
          }))}
          lines={[
            {
              id: line.id,
              color: line.color,
              mode: line.mode,
              geometry: line.geometry as [number, number][],
            },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {line.stops.map((stop, index) => (
          <Link
            key={stop.id}
            href={`/transport/stop/${stop.id}`}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 transition-colors hover:bg-accent"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: line.color }}
            >
              {index + 1}
            </span>
            <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
              {stop.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stop.imageUrl}
                  alt={stop.name}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-white/80">
                  <MapPin className="size-4" />
                </div>
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {stop.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
