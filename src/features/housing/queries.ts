import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { HOUSING_TYPES, HOUSING_AMENITIES } from "@/features/housing/schema";

export interface ListingCardData {
  id: string;
  title: string;
  type: string;
  price: number;
  currency: string;
  rooms: number;
  area: number | null;
  city: string;
  district: string | null;
  address: string | null;
  lat: number;
  lng: number;
  status: string;
  createdAt: Date;
  imageId: string | null;
  ownerId: string;
  ownerName: string;
  amenities: string[];
  isFavorite: boolean;
  isMine: boolean;
}

export interface ListingDetailData extends ListingCardData {
  description: string | null;
  floor: number | null;
  totalFloors: number | null;
  phone: string | null;
  telegram: string | null;
  amenities: string[];
  views: number;
  updatedAt: Date;
  images: string[];
}

const cardInclude = {
  images: { select: { id: true }, orderBy: { position: "asc" } as const },
  user: { select: { id: true, name: true } },
};

type ListingRow = {
  id: string;
  userId: string;
  title: string;
  type: string;
  price: number;
  currency: string;
  rooms: number;
  area: number | null;
  city: string;
  district: string | null;
  address: string | null;
  lat: number;
  lng: number;
  status: string;
  createdAt: Date;
  amenities: string[];
  images: { id: string }[];
  user: { id: string; name: string };
  favorites?: { id: string }[];
};

function toCard(row: ListingRow, userId: string): ListingCardData {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    price: row.price,
    currency: row.currency,
    rooms: row.rooms,
    area: row.area,
    city: row.city,
    district: row.district,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    createdAt: row.createdAt,
    imageId: row.images[0]?.id ?? null,
    ownerId: row.user.id,
    ownerName: row.user.name,
    amenities: row.amenities,
    isFavorite: (row.favorites?.length ?? 0) > 0,
    isMine: row.userId === userId,
  };
}

export async function getListings(params: ListParams = {}) {
  const { userId } = await verifySession();
  const conditions = [Prisma.sql`h."status" <> 'ARCHIVED'`];
  const q = param(params, "q");
  const type = param(params, "type");
  const rooms = param(params, "rooms");
  const city = param(params, "city");
  const convertedPrice = Prisma.sql`(h."price"::double precision * CASE WHEN h."currency" = 'USD' THEN 12600 ELSE 1 END)`;
  if (q) conditions.push(Prisma.sql`POSITION(LOWER(${q}) IN LOWER(CONCAT_WS(' ', h."title", h."city", h."district", h."address"))) > 0`);
  if ((HOUSING_TYPES as readonly string[]).includes(type)) conditions.push(Prisma.sql`h."type" = ${type}`);
  if (/^[1-5]$/.test(rooms)) conditions.push(rooms === "5" ? Prisma.sql`h."rooms" >= 5` : Prisma.sql`h."rooms" = ${Number(rooms)}`);
  if (city) conditions.push(Prisma.sql`h."city" = ${city}`);
  for (const key of ["min", "max"] as const) {
    const value = param(params, key);
    const number = Number(value);
    if (value && Number.isFinite(number) && number >= 0) conditions.push(key === "min" ? Prisma.sql`${convertedPrice} >= ${number}` : Prisma.sql`${convertedPrice} <= ${number}`);
  }
  const rawAmenities = params.amenity;
  const amenities = (Array.isArray(rawAmenities) ? rawAmenities : typeof rawAmenities === "string" ? [rawAmenities] : []).filter((value) => (HOUSING_AMENITIES as readonly string[]).includes(value));
  for (const amenity of amenities) conditions.push(Prisma.sql`${amenity} = ANY(h."amenities")`);
  if (param(params, "tab") === "saved") conditions.push(Prisma.sql`EXISTS(SELECT 1 FROM "HousingFavorite" f WHERE f."listingId" = h."id" AND f."userId" = ${userId})`);
  const sort = param(params, "sort", "new");
  let order = Prisma.sql`h."createdAt" DESC, h."id" DESC`;
  if (sort === "price-asc") order = Prisma.sql`${convertedPrice} ASC, h."id" ASC`;
  if (sort === "price-desc") order = Prisma.sql`${convertedPrice} DESC, h."id" DESC`;
  const lat = Number(param(params, "lat"));
  const lng = Number(param(params, "lng"));
  if (sort === "distance" && param(params, "lat") && param(params, "lng") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    order = Prisma.sql`ACOS(LEAST(1.0, GREATEST(-1.0, SIN(RADIANS(${lat}::double precision)) * SIN(RADIANS(h."lat")) + COS(RADIANS(${lat}::double precision)) * COS(RADIANS(h."lat")) * COS(RADIANS(h."lng" - ${lng}::double precision))))) ASC, h."id" ASC`;
  }
  const where = Prisma.join(conditions, " AND ");
  const [result, cities] = await Promise.all([
    queryPage(params.page,
      async () => Number((await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM "HousingListing" h WHERE ${where}`))[0]?.total ?? 0),
      async ({ skip, take }) => {
        const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT h."id" FROM "HousingListing" h WHERE ${where} ORDER BY ${order} OFFSET ${skip} LIMIT ${take}`);
        const rows = await prisma.housingListing.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          include: { ...cardInclude, images: { ...cardInclude.images, take: 1 }, favorites: { where: { userId }, select: { id: true } } },
        });
        const lookup = new Map(rows.map((row) => [row.id, row]));
        return ids.flatMap(({ id }) => { const row = lookup.get(id); return row ? [toCard(row, userId)] : []; });
      }),
    prisma.housingListing.groupBy({ by: ["city"], where: { status: { not: "ARCHIVED" } }, orderBy: { city: "asc" } }),
  ]);
  return { ...result, cities: cities.map((row) => row.city) };
}

export async function getSavedListings(params: ListParams = {}) {
  return getListings({ ...params, tab: "saved" });
}

export async function getListing(id: string): Promise<ListingDetailData | null> {
  const { userId } = await verifySession();

  const row = await prisma.housingListing.findFirst({
    where: { id },
    include: {
      ...cardInclude,
      favorites: { where: { userId }, select: { id: true } },
    },
  });

  if (!row) return null;

  return {
    ...toCard(row, userId),
    description: row.description,
    floor: row.floor,
    totalFloors: row.totalFloors,
    phone: row.phone,
    telegram: row.telegram,
    amenities: row.amenities,
    views: row.views,
    updatedAt: row.updatedAt,
    images: row.images.map((image) => image.id),
  };
}

export async function incrementListingViews(id: string) {
  try {
    await prisma.housingListing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  } catch {
    // Ko'rishlar sonini oshirib bo'lmasa ham sahifa ko'rsatiladi.
  }
}
