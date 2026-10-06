export interface PlannerStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mode: string;
}

export interface PlannerLine {
  id: string;
  ref: string;
  name: string;
  mode: string;
  color: string;
  stopIds: string[];
}

export interface RouteLeg {
  mode: string;
  lineId: string;
  lineRef: string;
  lineName: string;
  color: string;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  stops: { id: string; name: string }[];
  distanceMeters: number;
}

export interface PlannedRoute {
  found: boolean;
  legs: RouteLeg[];
  totalDistanceMeters: number;
  transfers: number;
}

interface Edge {
  toId: string;
  lineId: string;
  distance: number;
}

const TRANSFER_PENALTY = 500;

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function reconstruct(
  previous: Map<string, { state: string; edge: Edge }>,
  goal: string
) {
  const edges: { fromId: string; edge: Edge }[] = [];
  let current = goal;
  while (previous.has(current)) {
    const prev = previous.get(current)!;
    edges.push({ fromId: prev.state.split("|")[0], edge: prev.edge });
    current = prev.state;
  }
  return edges.reverse();
}

export function planRoute(
  stops: PlannerStop[],
  lines: PlannerLine[],
  fromId: string,
  toId: string
): PlannedRoute {
  if (fromId === toId) {
    return { found: true, legs: [], totalDistanceMeters: 0, transfers: 0 };
  }

  const stopById = new Map(stops.map((s) => [s.id, s]));
  const lineById = new Map(lines.map((l) => [l.id, l]));

  const neighbors = new Map<string, { edge: Edge; fromId: string }[]>();
  const addEdge = (fromId: string, toId2: string, lineId: string, distance: number) => {
    const list = neighbors.get(fromId) ?? [];
    list.push({ fromId, edge: { toId: toId2, lineId, distance } });
    neighbors.set(fromId, list);
  };

  for (const line of lines) {
    for (let i = 0; i < line.stopIds.length - 1; i += 1) {
      const a = stopById.get(line.stopIds[i]);
      const b = stopById.get(line.stopIds[i + 1]);
      if (!a || !b) continue;
      const distance = haversine(a.lat, a.lng, b.lat, b.lng);
      addEdge(a.id, b.id, line.id, distance);
      addEdge(b.id, a.id, line.id, distance);
    }
  }

  const dist = new Map<string, number>();
  const previous = new Map<string, { state: string; edge: Edge }>();
  const queue: { key: string; cost: number }[] = [];

  const startEdges = neighbors.get(fromId) ?? [];
  if (startEdges.length === 0) {
    return { found: false, legs: [], totalDistanceMeters: 0, transfers: 0 };
  }
  for (const { edge } of startEdges) {
    const key = `${fromId}|${edge.lineId}`;
    if (!dist.has(key)) {
      dist.set(key, 0);
      queue.push({ key, cost: 0 });
    }
  }

  let goalKey: string | null = null;
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (current.cost > (dist.get(current.key) ?? Infinity)) continue;

    const [stopId, currentLine] = current.key.split("|");
    if (stopId === toId) {
      goalKey = current.key;
      break;
    }

    for (const { edge } of neighbors.get(stopId) ?? []) {
      const penalty = edge.lineId === currentLine ? 0 : TRANSFER_PENALTY;
      const nextCost = current.cost + edge.distance + penalty;
      const nextKey = `${edge.toId}|${edge.lineId}`;
      if (nextCost < (dist.get(nextKey) ?? Infinity)) {
        dist.set(nextKey, nextCost);
        previous.set(nextKey, { state: current.key, edge });
        queue.push({ key: nextKey, cost: nextCost });
      }
    }
  }

  if (!goalKey) {
    return { found: false, legs: [], totalDistanceMeters: 0, transfers: 0 };
  }

  const edges = reconstruct(previous, goalKey);

  const legs: RouteLeg[] = [];
  let current: RouteLeg | null = null;
  for (const { fromId: edgeFrom, edge } of edges) {
    const line = lineById.get(edge.lineId);
    if (!line) continue;
    if (!current || current.lineId !== edge.lineId) {
      if (current) legs.push(current);
      current = {
        mode: line.mode,
        lineId: line.id,
        lineRef: line.ref,
        lineName: line.name,
        color: line.color,
        fromStopId: edgeFrom,
        fromStopName: stopById.get(edgeFrom)?.name ?? "",
        toStopId: edge.toId,
        toStopName: stopById.get(edge.toId)?.name ?? "",
        stops: [
          { id: edgeFrom, name: stopById.get(edgeFrom)?.name ?? "" },
          { id: edge.toId, name: stopById.get(edge.toId)?.name ?? "" },
        ],
        distanceMeters: edge.distance,
      };
    } else {
      current.toStopId = edge.toId;
      current.toStopName = stopById.get(edge.toId)?.name ?? "";
      current.stops.push({
        id: edge.toId,
        name: stopById.get(edge.toId)?.name ?? "",
      });
      current.distanceMeters += edge.distance;
    }
  }
  if (current) legs.push(current);

  const totalDistanceMeters = legs.reduce(
    (sum, leg) => sum + leg.distanceMeters,
    0
  );

  return {
    found: true,
    legs,
    totalDistanceMeters,
    transfers: Math.max(0, legs.length - 1),
  };
}

export function nearestStops(
  stops: PlannerStop[],
  lat: number,
  lng: number,
  limit = 5,
  mode?: string
) {
  return stops
    .filter((s) => !mode || s.mode === mode)
    .map((s) => ({ ...s, distance: haversine(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
