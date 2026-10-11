"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { detectRasterImageMime, RASTER_IMAGE_MIME_TYPES } from "@/lib/image";
import { housingSchema, type HousingInput } from "./schema";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 4_000_000;

function toData(input: HousingInput) {
  return {
    title: input.title,
    description: input.description?.trim() || null,
    type: input.type,
    price: input.price,
    currency: input.currency,
    rooms: input.rooms,
    area: input.area ?? null,
    floor: input.floor ?? null,
    totalFloors: input.totalFloors ?? null,
    city: input.city,
    district: input.district?.trim() || null,
    address: input.address?.trim() || null,
    lat: input.lat,
    lng: input.lng,
    phone: input.phone?.trim() || null,
    telegram: input.telegram?.trim() || null,
    amenities: input.amenities,
    status: input.status,
  };
}

export async function saveListing(
  input: HousingInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = housingSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    if (data.id) {
      const existing = await prisma.housingListing.findFirst({
        where: { id: data.id, userId },
        select: { id: true },
      });
      if (!existing) return fail("E'lon topilmadi");

      await prisma.housingListing.update({
        where: { id: data.id, userId },
        data: toData(data),
      });
      revalidatePath("/housing");
      revalidatePath(`/housing/${data.id}`);
      return ok({ id: data.id });
    }

    const created = await prisma.housingListing.create({
      data: { userId, ...toData(data) },
      select: { id: true },
    });
    revalidatePath("/housing");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.housingListing.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return fail("E'lon topilmadi");

  try {
    await prisma.housingListing.delete({ where: { id, userId } });
    revalidatePath("/housing");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

export async function uploadListingImage(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const listingId = String(formData.get("listingId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return fail("Rasm topilmadi");
  }
  if (!(RASTER_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return fail("Faqat JPEG, PNG, GIF yoki WebP rasmlarini yuklash mumkin");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return fail("Rasm hajmi juda katta (4 MB dan oshmasin)");
  }

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectRasterImageMime(data);
    if (!mimeType || mimeType !== file.type) {
      return fail("Rasm formati yoki fayl tarkibi noto'g'ri");
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const listing = await tx.housingListing.findFirst({
            where: { id: listingId, userId },
            select: { id: true },
          });
          if (!listing) return fail("E'lon topilmadi");

          const images = await tx.housingImage.aggregate({
            where: { listingId },
            _count: { _all: true },
            _max: { position: true },
          });
          if (images._count._all >= MAX_IMAGES) {
            return fail(`Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin`);
          }
          const image = await tx.housingImage.create({
            data: { listingId, mimeType, data, position: (images._max.position ?? -1) + 1 },
            select: { id: true },
          });
          return ok({ id: image.id });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        if (result.success) {
          revalidatePath("/housing");
          revalidatePath(`/housing/${listingId}`);
        }
        return result;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
        throw error;
      }
    }
    return fail("Rasmni saqlashda xatolik yuz berdi");
  } catch {
    return fail("Rasmni saqlashda xatolik yuz berdi");
  }
}

export async function deleteListingImage(
  imageId: string
): Promise<ActionResult> {
  const { userId } = await verifySession();

  const image = await prisma.housingImage.findFirst({
    where: { id: imageId, listing: { userId } },
    select: { id: true, listingId: true },
  });
  if (!image) return fail("Rasm topilmadi");

  try {
    await prisma.housingImage.delete({ where: { id: imageId, listing: { userId } } });
    revalidatePath("/housing");
    revalidatePath(`/housing/${image.listingId}`);
    return ok();
  } catch {
    return fail("Rasmni o'chirishda xatolik yuz berdi");
  }
}

export async function toggleFavorite(
  listingId: string
): Promise<ActionResult<{ favorite: boolean }>> {
  const { userId } = await verifySession();

  const listing = await prisma.housingListing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) return fail("E'lon topilmadi");

  try {
    const existing = await prisma.housingFavorite.findUnique({
      where: { userId_listingId: { userId, listingId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.housingFavorite.delete({ where: { id: existing.id } });
      revalidatePath("/housing");
      return ok({ favorite: false });
    }

    await prisma.housingFavorite.create({ data: { userId, listingId } });
    revalidatePath("/housing");
    return ok({ favorite: true });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}
