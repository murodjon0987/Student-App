"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { ok, type ActionResult } from "@/lib/types";
import {
  nearestStops,
  planRoute,
  type PlannedRoute,
  type PlannerLine,
  type PlannerStop,
} from "./planner";

async function loadPlannerData() {
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

export async function planTrip(
  fromId: string,
  toId: string
): Promise<ActionResult<PlannedRoute>> {
  await verifySession();
  const { stops, lines } = await loadPlannerData();
  const route = planRoute(stops, lines, fromId, toId);
  return ok(route);
}

export async function findNearbyStops(
  lat: number,
  lng: number,
  mode?: string
): Promise<ActionResult<(PlannerStop & { distance: number })[]>> {
  await verifySession();
  const { stops } = await loadPlannerData();
  return ok(nearestStops(stops, lat, lng, 6, mode));
}
