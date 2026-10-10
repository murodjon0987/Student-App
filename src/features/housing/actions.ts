"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
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
        where: { id: data.id },
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
    await prisma.housingListing.delete({ where: { id } });
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
  if (!file.type.startsWith("image/")) {
    return fail("Faqat rasm fayllarini yuklash mumkin");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return fail("Rasm hajmi juda katta (4 MB dan oshmasin)");
  }

  const listing = await prisma.housingListing.findFirst({
    where: { id: listingId, userId },
    select: { id: true },
  });
  if (!listing) return fail("E'lon topilmadi");

  try {
    const count = await prisma.housingImage.count({ where: { listingId } });
    if (count >= MAX_IMAGES) {
      return fail(`Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin`);
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const image = await prisma.housingImage.create({
      data: {
        listingId,
        mimeType: file.type,
        data,
        position: count,
      },
      select: { id: true },
    });

    revalidatePath("/housing");
    revalidatePath(`/housing/${listingId}`);
    return ok({ id: image.id });
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
    await prisma.housingImage.delete({ where: { id: imageId } });
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
