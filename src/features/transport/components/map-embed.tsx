"use client";

import dynamic from "next/dynamic";

import type { MapLine, MapStop } from "@/features/transport/components/transit-map";

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
  stops: MapStop[];
  lines?: MapLine[];
  showBus?: boolean;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  className?: string;
}

export function MapEmbed({ stops, lines = [], showBus, focus, className }: Props) {
  return (
    <TransitMap
      stops={stops}
      lines={lines}
      showBus={showBus}
      focus={focus}
      className={className ?? "h-full w-full"}
    />
  );
}
