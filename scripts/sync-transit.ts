import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, TransportMode } from "@prisma/client";

const prisma = new PrismaClient();

const CITY = "Tashkent";
const BBOX = "41.15,69.10,41.40,69.55";
const USER_AGENT =
  "StudentApp/1.0 (https://student-app-gules-six.vercel.app; mailto:demo@student.app)";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const COLOR_NAMES: Record<string, string> = {
  red: "#e11d48",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#7c3aed",
  violet: "#7c3aed",
  brown: "#92400e",
  pink: "#ec4899",
  black: "#111827",
  grey: "#6b7280",
  gray: "#6b7280",
  turquoise: "#06b6d4",
  cyan: "#06b6d4",
  light_blue: "#38bdf8",
  dark_blue: "#1e3a8a",
  dark_green: "#166534",
};

interface OverpassMember {
  type: string;
  ref: number;
  role: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  members?: OverpassMember[];
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface WdEntity {
  claims?: Record<
    string,
    { mainsnak?: { datavalue?: { value?: unknown } } }[]
  >;
  sitelinks?: Record<string, { title: string }>;
}
interface WdResponse {
  entities?: Record<string, WdEntity>;
}

interface PageImagesResponse {
  query?: {
    pages?: Record<
      string,
      { title: string; pageimage?: string; images?: { title: string }[] }
    >;
  };
}

interface CommonsPage {
  title: string;
  imageinfo?: {
    url?: string;
    thumburl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}
interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> };
}

interface WikiResponse {
  query?: { pages?: Record<string, { extract?: string }> };
}

interface StopSeed {
  osmType: "node";
  osmId: string;
  mode: TransportMode;
  name: string;
  nameUz: string | null;
  nameRu: string | null;
  nameEn: string | null;
  lat: number;
  lng: number;
  wikidataId: string | null;
}

interface LineSeed {
  mode: TransportMode;
  ref: string;
  name: string;
  nameUz: string | null;
  color: string;
  operator: string | null;
  stopRefs: string[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function overpass(query: string, attempt = 0): Promise<OverpassResponse> {
  const mirror = MIRRORS[attempt % MIRRORS.length];
  try {
    const res = await fetch(mirror, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trimStart().startsWith("{")) {
      const err = /Error<\/strong>:\s*([^<]+)/.exec(text);
      throw new Error(err ? `Overpass: ${err[1].trim()}` : "Overpass: non-JSON");
    }
    return JSON.parse(text) as OverpassResponse;
  } catch (error) {
    const maxAttempts = MIRRORS.length * 4;
    if (attempt < maxAttempts) {
      const wait = Math.min(45000, 6000 * (attempt + 1));
      console.warn(
        `  Overpass retry ${attempt + 1}/${maxAttempts} (${mirror}) in ${wait}ms: ${
          error instanceof Error ? error.message : "error"
        }`
      );
      await sleep(wait);
      return overpass(query, attempt + 1);
    }
    throw error;
  }
}

const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");

async function overpassCached(
  name: string,
  query: string
): Promise<OverpassResponse> {
  const file = path.join(CACHE_DIR, `${name}.json`);
  if (existsSync(file)) {
    console.log(`  (cache) ${name}`);
    return JSON.parse(readFileSync(file, "utf8")) as OverpassResponse;
  }
  const data = await overpass(query);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return data;
}

function normalizeColor(color: string | undefined, fallback: string) {
  if (!color) return fallback;
  const value = color.trim().toLowerCase();
  if (value.startsWith("#")) return value;
  return COLOR_NAMES[value.replace(/\s+/g, "_")] ?? fallback;
}

function pickName(tags: Record<string, string>) {
  return (
    tags["name:uz"] ||
    tags["name"] ||
    tags["name:ru"] ||
    tags["name:en"] ||
    ""
  );
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isPlausibleImage(name: string) {
  const lower = name.toLowerCase();
  const deny = [
    "commons-logo",
    "wikimedia",
    "wikipedia",
    "wikidata",
    "icon",
    "logo",
    "flag",
    "symbol",
    "padlock",
    "question",
    "ambox",
    "disambig",
    "star",
    "button",
    "nuvola",
    "crystal",
    "emblem",
    "pictogram",
    "edit",
    "blank",
    "map",
  ];
  return !deny.some((token) => lower.includes(token));
}

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

function isMetroStation(tags: Record<string, string> | undefined) {
  if (!tags) return false;
  if (tags.station === "subway") return true;
  if (tags.railway === "station" && tags.station === "subway") return true;
  if (tags.public_transport === "station" && tags.subway === "yes") return true;
  return false;
}

async function fetchImages(ids: string[]) {
  const result = new Map<
    string,
    { url: string; author: string; license: string }
  >();
  if (ids.length === 0) return result;

  const filenameByEntity = new Map<string, string>();
  const wikiTitleByEntity = new Map<string, { wiki: string; title: string }>();

  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&ids=${batch.join(
      "|"
    )}`;
    try {
      const json = await getJson<WdResponse>(url);
      for (const [id, entity] of Object.entries(json.entities ?? {})) {
        const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (typeof filename === "string") {
          filenameByEntity.set(id, filename);
          continue;
        }
        const sitelinks = entity.sitelinks ?? {};
        for (const wikiKey of ["enwiki", "ruwiki", "uzwiki"]) {
          const link = sitelinks[wikiKey];
          if (link?.title) {
            wikiTitleByEntity.set(id, {
              wiki: wikiKey.replace(/wiki$/, ""),
              title: link.title,
            });
            break;
          }
        }
      }
    } catch (error) {
      console.warn(`  Wikidata batch failed: ${(error as Error).message}`);
    }
    await sleep(300);
  }

  const pageImageFilenameByEntity = new Map<string, string>();
  const byWiki = new Map<string, { id: string; title: string }[]>();
  for (const [id, info] of wikiTitleByEntity) {
    const list = byWiki.get(info.wiki) ?? [];
    list.push({ id, title: info.title });
    byWiki.set(info.wiki, list);
  }

  for (const [wiki, items] of byWiki) {
    const normalize = (value: string) =>
      value.replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const titleToId = new Map(
      items.map((it) => [normalize(it.title), it.id])
    );
    for (let i = 0; i < items.length; i += 20) {
      const batch = items.slice(i, i + 20);
      const titles = batch.map((it) => it.title).join("|");
      const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|images&imlimit=15&redirects=1&titles=${encodeURIComponent(
        titles
      )}`;
      try {
        const json = await getJson<PageImagesResponse>(url);
        for (const page of Object.values(json.query?.pages ?? {})) {
          const entityId = titleToId.get(normalize(page.title));
          if (!entityId) continue;
          if (page.pageimage) {
            pageImageFilenameByEntity.set(entityId, page.pageimage);
            continue;
          }
          const image = (page.images ?? [])
            .map((img) => img.title.replace(/^File:/, ""))
            .find(
              (name) =>
                /\.(jpe?g|png)$/i.test(name) &&
                isPlausibleImage(name)
            );
          if (image) pageImageFilenameByEntity.set(entityId, image);
        }
      } catch (error) {
        console.warn(`  Wikipedia pageimages failed: ${(error as Error).message}`);
      }
      await sleep(300);
    }
  }

  console.log(
    `    P18=${filenameByEntity.size}, pageimages=${pageImageFilenameByEntity.size}, sitelinks=${wikiTitleByEntity.size}`
  );

  const filenames = Array.from(
    new Set([
      ...filenameByEntity.values(),
      ...pageImageFilenameByEntity.values(),
    ])
  );
  const infoByFile = new Map<
    string,
    { url: string; author: string; license: string }
  >();
  const normalizeFile = (value: string) =>
    value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  for (let i = 0; i < filenames.length; i += 40) {
    const batch = filenames.slice(i, i + 40);
    const titles = batch.map((f) => `File:${f}`).join("|");
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1000&titles=${encodeURIComponent(
      titles
    )}`;
    try {
      const json = await getJson<CommonsResponse>(url);
      for (const page of Object.values(json.query?.pages ?? {})) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        const meta = info.extmetadata ?? {};
        infoByFile.set(normalizeFile(page.title.replace(/^File:/, "")), {
          url: info.thumburl || info.url || "",
          author: stripHtml(meta.Artist?.value ?? ""),
          license: stripHtml(meta.LicenseShortName?.value ?? ""),
        });
      }
    } catch (error) {
      console.warn(`  Commons batch failed: ${(error as Error).message}`);
    }
    await sleep(300);
  }

  for (const id of ids) {
    const filename =
      filenameByEntity.get(id) ?? pageImageFilenameByEntity.get(id);
    if (!filename) continue;
    const info = infoByFile.get(normalizeFile(filename));
    if (info?.url) result.set(id, info);
  }
  return result;
}

async function wikiExtract(title: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(
    title
  )}`;
  try {
    const json = await getJson<WikiResponse>(url);
    const page = Object.values(json.query?.pages ?? {})[0];
    return page?.extract ?? "";
  } catch {
    return "";
  }
}

function findFare(text: string) {
  const m = text.match(
    /([\d][\d\s,\.]{2,})\s*(soum|sum|so[‘’'`ʻ]?m|uzs)/i
  );
  if (!m) return null;
  const amount = Number(m[1].replace(/[\s,\.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

async function syncFares() {
  const metroText = await wikiExtract("Tashkent Metro");
  const metroFare = findFare(metroText);

  let busFare: number | null = null;
  for (const title of [
    "Transport in Tashkent",
    "Tashkent",
    "Tashkent bus",
  ]) {
    const text = await wikiExtract(title);
    const busContext = text.match(/[^.]{0,120}\bbus[^.]{0,160}\./i);
    if (busContext) {
      const found = findFare(busContext[0]);
      if (found) {
        busFare = found;
        break;
      }
    }
    await sleep(300);
  }

  const fares = [
    {
      mode: TransportMode.METRO,
      amount: metroFare ?? 3000,
      note: metroFare
        ? "Bir martalik yo'l haqi (manba: Wikipedia)"
        : "Taxminiy qiymat",
      source: metroFare
        ? "https://en.wikipedia.org/wiki/Tashkent_Metro"
        : null,
    },
    {
      mode: TransportMode.BUS,
      amount: busFare ?? metroFare ?? 3000,
      note: busFare
        ? "Avtobus yo'l haqi (manba: Wikipedia)"
        : "Taxminiy qiymat - rasmiy manbadan tasdiqlang",
      source: busFare
        ? "https://en.wikipedia.org/wiki/Transport_in_Tashkent"
        : null,
    },
  ];

  for (const fare of fares) {
    await prisma.transitFare.upsert({
      where: { city_mode: { city: CITY, mode: fare.mode } },
      create: {
        city: CITY,
        mode: fare.mode,
        amount: fare.amount,
        currency: "UZS",
        note: fare.note,
        source: fare.source,
        effectiveFrom: new Date(),
      },
      update: {
        amount: fare.amount,
        note: fare.note,
        source: fare.source,
        effectiveFrom: new Date(),
      },
    });
  }

  console.log(
    `  Fares: metro=${fares[0].amount} UZS${
      metroFare ? "" : " (fallback)"
    }, bus=${fares[1].amount} UZS${busFare ? "" : " (fallback)"}`
  );
}

async function main() {
  console.log("1) Overpass: metro...");
  const metroData = await overpassCached(
    "metro",
    `[out:json][timeout:180];(node["station"="subway"](${BBOX});rel["route"="subway"](${BBOX}););out body;`
  );
  await sleep(4000);

  console.log("2) Overpass: avtobus bekatlari...");
  const busStopsData = await overpassCached(
    "bus_stops",
    `[out:json][timeout:240];node["highway"="bus_stop"](${BBOX});out body;`
  );
  await sleep(4000);

  console.log("3) Overpass: avtobus yo'nalishlari...");
  const busRoutesData = await overpassCached(
    "bus_routes",
    `[out:json][timeout:240];rel["route"="bus"](${BBOX});out body;`
  );

  const nodes = new Map<number, OverpassElement>();
  const relations: OverpassElement[] = [];
  for (const el of [
    ...(metroData.elements ?? []),
    ...(busStopsData.elements ?? []),
    ...(busRoutesData.elements ?? []),
  ]) {
    if (el.type === "node") nodes.set(el.id, el);
    else if (el.type === "relation") relations.push(el);
  }

  const missingNodeIds = new Set<number>();
  for (const rel of relations) {
    for (const member of rel.members ?? []) {
      if (
        member.type === "node" &&
        /stop|platform|station/i.test(member.role) &&
        !nodes.has(member.ref)
      ) {
        missingNodeIds.add(member.ref);
      }
    }
  }

  if (missingNodeIds.size > 0) {
    console.log(`4) Yetishmayotgan ${missingNodeIds.size} tugun yuklanmoqda...`);
    const ids = Array.from(missingNodeIds);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = ids.slice(i, i + 400);
      const data = await overpassCached(
        `missing_${i}`,
        `[out:json][timeout:120];node(id:${batch.join(",")});out body;`
      );
      for (const el of data.elements ?? []) {
        if (el.type === "node") nodes.set(el.id, el);
      }
    }
  }

  const stopByOsm = new Map<string, StopSeed>();

  function addStop(
    node: OverpassElement,
    mode: TransportMode,
    override = false
  ): StopSeed | null {
    const key = `node/${node.id}`;
    const tags = node.tags ?? {};
    const name = pickName(tags);
    if (!name || node.lat == null || node.lon == null) return null;
    if (!stopByOsm.has(key) || override) {
      stopByOsm.set(key, {
        osmType: "node",
        osmId: String(node.id),
        mode,
        name,
        nameUz: tags["name:uz"] ?? null,
        nameRu: tags["name:ru"] ?? null,
        nameEn: tags["name:en"] ?? null,
        lat: node.lat,
        lng: node.lon,
        wikidataId: tags.wikidata ?? null,
      });
    }
    return stopByOsm.get(key) ?? null;
  }

  const metroStations: { key: string; lat: number; lng: number }[] = [];
  for (const node of nodes.values()) {
    if (isMetroStation(node.tags)) {
      const seed = addStop(node, TransportMode.METRO);
      if (seed) {
        metroStations.push({
          key: `node/${node.id}`,
          lat: seed.lat,
          lng: seed.lng,
        });
      }
    }
  }
  for (const node of nodes.values()) {
    if (node.tags?.highway === "bus_stop") addStop(node, TransportMode.BUS);
  }

  function nearestMetroStation(lat: number, lng: number) {
    let best: { key: string; lat: number; lng: number } | null = null;
    let bestDistance = 350;
    for (const station of metroStations) {
      const distance = haversine(lat, lng, station.lat, station.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = station;
      }
    }
    return best;
  }

  const lineByKey = new Map<string, LineSeed>();

  for (const rel of relations) {
    const route = rel.tags?.route;
    const mode =
      route === "subway"
        ? TransportMode.METRO
        : route === "bus"
          ? TransportMode.BUS
          : null;
    if (!mode) continue;

    const tags = rel.tags ?? {};
    const ref = tags.ref || tags["ref:uz"] || tags.name || String(rel.id);
    const stopRefs: string[] = [];

    for (const member of rel.members ?? []) {
      if (member.type !== "node") continue;
      if (!/stop|platform|station/i.test(member.role || "")) continue;
      const node = nodes.get(member.ref);
      if (!node || node.lat == null || node.lon == null) continue;

      let key: string | null = null;
      if (mode === TransportMode.METRO) {
        const near = nearestMetroStation(node.lat, node.lon);
        key = near?.key ?? null;
      } else {
        const memberTags = node.tags ?? {};
        const looksLikeStop =
          memberTags.highway === "bus_stop" ||
          memberTags.public_transport === "platform" ||
          memberTags.amenity === "bus_station";
        const existing = stopByOsm.get(`node/${member.ref}`);
        if (!looksLikeStop && !existing) continue;
        const seed = existing ?? addStop(node, TransportMode.BUS);
        key = seed ? `node/${member.ref}` : null;
      }

      if (!key) continue;
      if (stopRefs[stopRefs.length - 1] === key) continue;
      stopRefs.push(key);
    }

    if (stopRefs.length < 2) continue;

    const key = `${mode}:${ref}`;
    const existing = lineByKey.get(key);
    if (existing && existing.stopRefs.length >= stopRefs.length) continue;

    lineByKey.set(key, {
      mode,
      ref: String(ref),
      name: tags.name || `${ref}`,
      nameUz: tags["name:uz"] ?? null,
      color: normalizeColor(
        tags.colour,
        mode === TransportMode.METRO ? "#6366f1" : "#0ea5e9"
      ),
      operator: tags.operator ?? null,
      stopRefs,
    });
  }

  const stopList = Array.from(stopByOsm.values());
  const lineList = Array.from(lineByKey.values());

  console.log(
    `Tozalash va yozish: ${stopList.length} bekat, ${lineList.length} yo'nalish`
  );

  await prisma.transitLine.deleteMany({ where: { city: CITY } });
  await prisma.transitStop.deleteMany({ where: { city: CITY } });

  await prisma.transitStop.createMany({
    data: stopList.map((s) => ({
      city: CITY,
      mode: s.mode,
      name: s.name,
      nameUz: s.nameUz,
      nameRu: s.nameRu,
      nameEn: s.nameEn,
      lat: s.lat,
      lng: s.lng,
      osmType: s.osmType,
      osmId: s.osmId,
      wikidataId: s.wikidataId,
    })),
  });

  const dbStops = await prisma.transitStop.findMany({
    where: { city: CITY },
    select: { id: true, osmType: true, osmId: true },
  });
  const idByOsm = new Map(
    dbStops.map((s) => [`${s.osmType}/${s.osmId}`, s.id])
  );

  let createdLines = 0;
  let createdLineStops = 0;
  for (const line of lineList) {
    const created = await prisma.transitLine.create({
      data: {
        city: CITY,
        mode: line.mode,
        ref: line.ref,
        name: line.name,
        nameUz: line.nameUz,
        color: line.color,
        operator: line.operator,
        geometry: line.stopRefs.map((ref) => {
          const stop = stopByOsm.get(ref);
          return [stop?.lat ?? 0, stop?.lng ?? 0];
        }),
      },
    });
    createdLines += 1;

    const rows = line.stopRefs
      .map((ref, index) => ({
        lineId: created.id,
        stopId: idByOsm.get(ref),
        sequence: index,
      }))
      .filter((row): row is { lineId: string; stopId: string; sequence: number } =>
        Boolean(row.stopId)
      );
    if (rows.length) {
      await prisma.transitLineStop.createMany({ data: rows });
      createdLineStops += rows.length;
    }
  }

  console.log(`  Lines created: ${createdLines}, lineStops: ${createdLineStops}`);

  console.log("5) Wikimedia rasmlari...");
  const metroWithWikidata = stopList.filter(
    (s) => s.mode === TransportMode.METRO && s.wikidataId
  );
  const images = await fetchImages(
    metroWithWikidata.map((s) => s.wikidataId as string)
  );
  let imageCount = 0;
  for (const stop of metroWithWikidata) {
    const image = images.get(stop.wikidataId as string);
    const id = idByOsm.get(`${stop.osmType}/${stop.osmId}`);
    if (!image || !id) continue;
    await prisma.transitStop.update({
      where: { id },
      data: {
        imageUrl: image.url,
        imageAuthor: image.author || null,
        imageLicense: image.license || null,
      },
    });
    imageCount += 1;
  }
  console.log(`  Rasmlar: ${imageCount}/${metroWithWikidata.length}`);

  console.log("6) Narxlar (Wikipedia)...");
  await syncFares();

  const summary = {
    stops: await prisma.transitStop.count({ where: { city: CITY } }),
    metroStops: await prisma.transitStop.count({
      where: { city: CITY, mode: TransportMode.METRO },
    }),
    busStops: await prisma.transitStop.count({
      where: { city: CITY, mode: TransportMode.BUS },
    }),
    lines: await prisma.transitLine.count({ where: { city: CITY } }),
    metroLines: await prisma.transitLine.count({
      where: { city: CITY, mode: TransportMode.METRO },
    }),
    busLines: await prisma.transitLine.count({
      where: { city: CITY, mode: TransportMode.BUS },
    }),
  };
  console.log("Yakun:", summary);
}

main()
  .catch((error) => {
    console.error("SYNC FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
