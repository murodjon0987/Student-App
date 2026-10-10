import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

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

export async function getListings(): Promise<ListingCardData[]> {
  const { userId } = await verifySession();

  const rows = await prisma.housingListing.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      ...cardInclude,
      favorites: { where: { userId }, select: { id: true } },
    },
  });

  return rows.map((row) => toCard(row, userId));
}

export async function getSavedListings(): Promise<ListingCardData[]> {
  const { userId } = await verifySession();

  const rows = await prisma.housingListing.findMany({
    where: { favorites: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      ...cardInclude,
      favorites: { where: { userId }, select: { id: true } },
    },
  });

  return rows.map((row) => ({ ...toCard(row, userId), isFavorite: true }));
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
