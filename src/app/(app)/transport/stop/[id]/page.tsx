import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bus, Clock, MapPin, TrainFront } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { getFares, getStopDetail } from "@/features/transport/queries";
import { MapEmbed } from "@/features/transport/components/map-embed";

export const metadata: Metadata = { title: "Bekat" };

const MODE_LABEL: Record<string, string> = {
  METRO: "Metro bekati",
  BUS: "Avtobus bekati",
  TRAM: "Tramvay bekati",
  TROLLEYBUS: "Troleybus bekati",
};

export default async function StopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [stop, fares] = await Promise.all([getStopDetail(id), getFares()]);
  if (!stop) notFound();

  const fare = fares.find((f) => f.mode === stop.mode);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/transport"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Transport
      </Link>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-56 w-full overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500">
          {stop.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stop.imageUrl}
              alt={stop.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-white/90">
              {stop.mode === "METRO" ? (
                <TrainFront className="size-12" />
              ) : (
                <Bus className="size-12" />
              )}
            </div>
          )}
        </div>
        <div className="space-y-4 p-5">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {stop.mode === "METRO" ? (
                <TrainFront className="size-3.5" />
              ) : (
                <Bus className="size-3.5" />
              )}
              {MODE_LABEL[stop.mode] ?? stop.mode}
            </span>
            <h1 className="mt-2 text-2xl font-bold">
              {stop.nameUz ?? stop.name}
            </h1>
            {(stop.nameEn || stop.nameRu) && (
              <p className="text-sm text-muted-foreground">
                {[stop.nameEn, stop.nameRu].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {stop.imageAuthor && (
            <p className="text-xs text-muted-foreground">
              Rasm: {stop.imageAuthor}
              {stop.imageLicense ? ` · ${stop.imageLicense}` : ""} (Wikimedia
              Commons)
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
            </span>
            {fare && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                Yo'l haqi: {formatCurrency(fare.amount, fare.currency)}
              </span>
            )}
          </div>

          {stop.lines.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Liniyalar</p>
              <div className="flex flex-wrap gap-2">
                {stop.lines.map((line) => (
                  <Link
                    key={line.id}
                    href={`/transport/line/${line.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.ref}
                    <span className="font-normal opacity-80">
                      · {line.stopCount} bekat
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-72 overflow-hidden rounded-xl border border-border">
        <MapEmbed
          stops={[
            {
              id: stop.id,
              name: stop.name,
              lat: stop.lat,
              lng: stop.lng,
              mode: stop.mode,
            },
          ]}
          focus={{ lat: stop.lat, lng: stop.lng, zoom: 16 }}
        />
      </div>
    </div>
  );
}
