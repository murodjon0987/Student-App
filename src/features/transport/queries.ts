import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import type { PlannerLine, PlannerStop } from "./planner";

export interface StopListItem {
  id: string;
  name: string;
  nameUz: string | null;
  lat: number;
  lng: number;
  mode: string;
  imageUrl: string | null;
}

export interface LineListItem {
  id: string;
  ref: string;
  name: string;
  nameUz: string | null;
  mode: string;
  color: string;
  operator: string | null;
  geometry: [number, number][] | null;
  stopIds: string[];
}

export interface FareItem {
  mode: string;
  amount: number;
  currency: string;
  note: string | null;
  source: string | null;
  effectiveFrom: Date | null;
}

export async function getFares(): Promise<FareItem[]> {
  await verifySession();
  const fares = await prisma.transitFare.findMany();
  return fares.map((fare) => ({
    mode: fare.mode,
    amount: fare.amount,
    currency: fare.currency,
    note: fare.note,
    source: fare.source,
    effectiveFrom: fare.effectiveFrom,
  }));
}

export async function getTransitData() {
  await verifySession();

  const [stops, lines, fares] = await Promise.all([
    prisma.transitStop.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nameUz: true,
        lat: true,
        lng: true,
        mode: true,
        imageUrl: true,
      },
    }),
    prisma.transitLine.findMany({
      orderBy: [{ mode: "asc" }, { ref: "asc" }],
      include: {
        stops: {
          orderBy: { sequence: "asc" },
          select: { stopId: true },
        },
      },
    }),
    prisma.transitFare.findMany(),
  ]);

  return {
    stops: stops as StopListItem[],
    lines: lines.map(
      (line): LineListItem => ({
        id: line.id,
        ref: line.ref,
        name: line.name,
        nameUz: line.nameUz,
        mode: line.mode,
        color: line.color,
        operator: line.operator,
        geometry: (line.geometry as [number, number][] | null) ?? null,
        stopIds: line.stops.map((ls) => ls.stopId),
      })
    ),
    fares: fares.map(
      (fare): FareItem => ({
        mode: fare.mode,
        amount: fare.amount,
        currency: fare.currency,
        note: fare.note,
        source: fare.source,
        effectiveFrom: fare.effectiveFrom,
      })
    ),
  };
}

export async function getStopDetail(id: string) {
  await verifySession();

  const stop = await prisma.transitStop.findUnique({
    where: { id },
    include: {
      lineStops: {
        include: {
          line: {
            include: { _count: { select: { stops: true } } },
          },
        },
      },
    },
  });
  if (!stop) return null;

  const lines = stop.lineStops
    .map((ls) => ({
      id: ls.line.id,
      ref: ls.line.ref,
      name: ls.line.name,
      nameUz: ls.line.nameUz,
      mode: ls.line.mode,
      color: ls.line.color,
      operator: ls.line.operator,
      stopCount: ls.line._count.stops,
    }))
    .sort((a, b) => a.mode.localeCompare(b.mode) || a.ref.localeCompare(b.ref));

  return {
    id: stop.id,
    name: stop.name,
    nameUz: stop.nameUz,
    nameRu: stop.nameRu,
    nameEn: stop.nameEn,
    mode: stop.mode,
    lat: stop.lat,
    lng: stop.lng,
    imageUrl: stop.imageUrl,
    imageAuthor: stop.imageAuthor,
    imageLicense: stop.imageLicense,
    wikidataId: stop.wikidataId,
    lines,
  };
}

export async function getLineDetail(id: string) {
  await verifySession();

  const line = await prisma.transitLine.findUnique({
    where: { id },
    include: {
      stops: {
        orderBy: { sequence: "asc" },
        include: {
          stop: {
            select: {
              id: true,
              name: true,
              lat: true,
              lng: true,
              imageUrl: true,
              mode: true,
            },
          },
        },
      },
    },
  });
  if (!line) return null;

  return {
    id: line.id,
    ref: line.ref,
    name: line.name,
    nameUz: line.nameUz,
    mode: line.mode,
    color: line.color,
    operator: line.operator,
    geometry: (line.geometry as [number, number][] | null) ?? null,
    stops: line.stops.map((ls) => ({
      sequence: ls.sequence,
      ...ls.stop,
    })),
  };
}

export async function getPlannerData() {
  const [stops, lines] = await Promise.all([
    prisma.transitStop.findMany({
      select: { id: true, name: true, lat: true, lng: true, mode: true },
    }),
    prisma.transitLine.findMany({
      select: {
        id: true,
        ref: true,
        name: true,
        mode: true,
        color: true,
        stops: {
          orderBy: { sequence: "asc" },
          select: { stopId: true },
        },
      },
    }),
  ]);

  const plannerStops = stops as PlannerStop[];
  const plannerLines: PlannerLine[] = lines.map((line) => ({
    id: line.id,
    ref: line.ref,
    name: line.name,
    mode: line.mode,
    color: line.color,
    stopIds: line.stops.map((s) => s.stopId),
  }));

  return { stops: plannerStops, lines: plannerLines };
}
