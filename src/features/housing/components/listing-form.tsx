"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, LocateFixed, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { RASTER_IMAGE_MIME_TYPES } from "@/lib/image";
import {
  deleteListingImage,
  saveListing,
  uploadListingImage,
} from "@/features/housing/actions";
import { compressImage } from "@/features/housing/image-utils";
import {
  HOUSING_AMENITIES,
  HOUSING_AMENITY_LABELS,
  HOUSING_CURRENCIES,
  HOUSING_STATUSES,
  HOUSING_STATUS_LABELS,
  HOUSING_TYPES,
  HOUSING_TYPE_LABELS,
  housingSchema,
  type HousingInput,
} from "@/features/housing/schema";
import type { ListingDetailData } from "@/features/housing/queries";
import HousingMap from "@/features/housing/components/housing-map";

const CITY_PRESETS: Record<string, { lat: number; lng: number }> = {
  Toshkent: { lat: 41.3111, lng: 69.2797 },
  Namangan: { lat: 40.9983, lng: 71.6726 },
  Samarqand: { lat: 39.6542, lng: 66.9597 },
  Buxoro: { lat: 39.7747, lng: 64.4286 },
  Andijon: { lat: 40.7821, lng: 72.3442 },
  "Farg'ona": { lat: 40.3864, lng: 71.7864 },
  Nukus: { lat: 42.4531, lng: 59.6103 },
  Qarshi: { lat: 38.8606, lng: 65.7891 },
  Termiz: { lat: 37.2242, lng: 67.2783 },
  Urganch: { lat: 41.55, lng: 60.6333 },
  Navoiy: { lat: 40.0845, lng: 65.379 },
  Jizzax: { lat: 40.1158, lng: 67.8422 },
  Guliston: { lat: 40.4897, lng: 68.7842 },
};

const CITY_NAMES = Object.keys(CITY_PRESETS);

const numberValue = (value: unknown) =>
  value === "" || value === null || value === undefined
    ? undefined
    : Number(value);

interface Props {
  initial?: ListingDetailData | null;
}

export function ListingForm({ initial }: Props) {
  const router = useRouter();
  const [savedListingId, setSavedListingId] = React.useState(initial?.id);
  const isEdit = Boolean(savedListingId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HousingInput>({
    resolver: zodResolver(housingSchema),
    defaultValues: {
      id: initial?.id,
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      type: (initial?.type as HousingInput["type"]) ?? "APARTMENT",
      price: initial?.price ?? 0,
      currency: (initial?.currency as HousingInput["currency"]) ?? "UZS",
      rooms: initial?.rooms ?? 1,
      area: initial?.area ?? undefined,
      floor: initial?.floor ?? undefined,
      totalFloors: initial?.totalFloors ?? undefined,
      city: initial?.city ?? "Toshkent",
      district: initial?.district ?? "",
      address: initial?.address ?? "",
      lat: initial?.lat ?? 41.3111,
      lng: initial?.lng ?? 69.2797,
      phone: initial?.phone ?? "",
      telegram: initial?.telegram ?? "",
      amenities: (initial?.amenities as HousingInput["amenities"]) ?? [],
      status: (initial?.status as HousingInput["status"]) ?? "ACTIVE",
    },
  });

  const type = watch("type");
  const currency = watch("currency");
  const status = watch("status");
  const city = watch("city");
  const amenities = watch("amenities");
  const lat = watch("lat");
  const lng = watch("lng");

  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [existingImages, setExistingImages] = React.useState<string[]>(
    initial?.images ?? []
  );
  const [imageBusy, setImageBusy] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const previews = React.useMemo(
    () => pendingFiles.map((file) => URL.createObjectURL(file)),
    [pendingFiles]
  );
  React.useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews]
  );

  function handleCityChange(value: string) {
    setValue("city", value, { shouldDirty: true });
    const preset = CITY_PRESETS[value];
    if (preset) {
      setValue("lat", preset.lat, { shouldDirty: true });
      setValue("lng", preset.lng, { shouldDirty: true });
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("lat", position.coords.latitude, { shouldDirty: true });
        setValue("lng", position.coords.longitude, { shouldDirty: true });
        toast.success("Joylashuvingiz belgilandi");
      },
      () => toast.error("Joylashuvni aniqlab bo'lmadi"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function onFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const allowedFiles = files.filter((file) =>
      (RASTER_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
    );
    if (allowedFiles.length !== files.length) {
      toast.error("Faqat JPEG, PNG, GIF yoki WebP rasmlarini tanlang");
    }
    if (allowedFiles.length > 10 - existingImages.length - pendingFiles.length) {
      toast.error("Ko'pi bilan 10 ta rasm qo'shish mumkin");
    }
    setPendingFiles((prev) => [...prev, ...allowedFiles].slice(0, Math.max(0, 10 - existingImages.length)));
    event.target.value = "";
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function removeExisting(imageId: string) {
    setImageBusy(true);
    try {
      const result = await deleteListingImage(imageId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setExistingImages((prev) => prev.filter((id) => id !== imageId));
      toast.success("Rasm o'chirildi");
    } catch {
      toast.error("Rasmni o'chirishda xatolik. Qaytadan urinib ko'ring.");
    } finally {
      setImageBusy(false);
    }
  }

  async function onSubmit(values: HousingInput) {
    setUploadError(null);
    try {
      const result = await saveListing({ ...values, id: savedListingId ?? values.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const listingId = result.data.id;
      // Keep the saved ID for retries after a partial upload failure.
      setSavedListingId(listingId);
      setValue("id", listingId);

      if (pendingFiles.length > 0) {
        setImageBusy(true);
        const failedFiles: File[] = [];
        let failureMessage = "Rasmni yuklashda xatolik";
        for (const file of pendingFiles) {
          try {
            const compressed = await compressImage(file);
            const formData = new FormData();
            formData.append("listingId", listingId);
            formData.append("file", compressed);
            const uploaded = await uploadListingImage(formData);
            if (!uploaded.success) {
              failedFiles.push(file);
              failureMessage = uploaded.error;
            } else {
              setExistingImages((prev) => [...prev, uploaded.data.id]);
            }
          } catch {
            failedFiles.push(file);
          }
        }
        setPendingFiles(failedFiles);
        if (failedFiles.length > 0) {
          const message = `E'lon saqlandi, lekin ${failedFiles.length} ta rasm yuklanmadi. ${failureMessage}. Qayta saqlang yoki yuklanmagan rasmlarni olib tashlang.`;
          setUploadError(message);
          toast.error(message);
          return;
        }
      }

      toast.success(isEdit ? "E'lon yangilandi" : "E'lon joylashtirildi");
      router.push(`/housing/${listingId}`);
      router.refresh();
    } catch {
      toast.error("E'lonni saqlashda xatolik. Qaytadan urinib ko'ring.");
    } finally {
      setImageBusy(false);
    }
  }

  const totalImages = existingImages.length + pendingFiles.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={isEdit ? "E'lonni tahrirlash" : "Yangi e'lon"}
        description="Kvartira ma'lumotlarini to'ldiring va xaritada joyni belgilang."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {uploadError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{uploadError}</p>}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="title">Sarlavha</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Masalan: 2 xonali kvartira, markazda"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tavsif</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Kvartira haqida batafsil ma'lumot..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setValue("type", value as HousingInput["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUSING_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {HOUSING_TYPE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rooms">Xonalar soni</Label>
              <Input
                id="rooms"
                type="number"
                min={1}
                {...register("rooms", { setValueAs: numberValue })}
              />
            </div>

            <div className="space-y-2">
              <Label>Holat</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue("status", value as HousingInput["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUSING_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {HOUSING_STATUS_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Narx (oylik)</Label>
              <div className="flex gap-2">
                <Input
                  id="price"
                  type="number"
                  min={0}
                  {...register("price", { setValueAs: numberValue })}
                  className="flex-1"
                />
                <Select
                  value={currency}
                  onValueChange={(value) =>
                    setValue("currency", value as HousingInput["currency"])
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUSING_CURRENCIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="area">Maydon m²</Label>
                <Input
                  id="area"
                  type="number"
                  {...register("area", { setValueAs: numberValue })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Qavat</Label>
                <Input
                  id="floor"
                  type="number"
                  {...register("floor", { setValueAs: numberValue })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalFloors">Jami</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  {...register("totalFloors", { setValueAs: numberValue })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Qulayliklar</Label>
            <div className="flex flex-wrap gap-2">
              {HOUSING_AMENITIES.map((amenity) => {
                const active = amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() =>
                      setValue(
                        "amenities",
                        active
                          ? amenities.filter((item) => item !== amenity)
                          : [...amenities, amenity],
                        { shouldDirty: true }
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {HOUSING_AMENITY_LABELS[amenity]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Manzil va xarita</p>
              <p className="text-xs text-muted-foreground">
                Xaritani bosib yoki markerni surib aniq joyni belgilang.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
              <LocateFixed className="size-4" /> Joylashuvim
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">Shahar</Label>
              <Input
                id="city"
                list="housing-cities"
                value={city}
                onChange={(event) => handleCityChange(event.target.value)}
                placeholder="Toshkent"
              />
              <datalist id="housing-cities">
                {CITY_NAMES.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Tuman</Label>
              <Input
                id="district"
                {...register("district")}
                placeholder="Masalan: Chilonzor"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Manzil</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="Ko'cha, uy raqami"
            />
          </div>

          <div className="h-72 overflow-hidden rounded-xl border border-border">
            <HousingMap
              pickMode
              value={{ lat, lng }}
              onPick={(nextLat, nextLng) => {
                setValue("lat", nextLat, { shouldDirty: true });
                setValue("lng", nextLng, { shouldDirty: true });
              }}
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">Rasmlar</p>
            <p className="text-xs text-muted-foreground">
              Galereyadan rasm tanlang (ko&apos;pi bilan 10 ta).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existingImages.map((imageId) => (
              <div
                key={imageId}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/housing/image/${imageId}`}
                  alt="Rasm"
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  disabled={imageBusy || isSubmitting}
                  onClick={() => removeExisting(imageId)}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="O'chirish"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}

            {previews.map((url, index) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Yangi rasm" className="size-full object-cover" />
                <button
                  type="button"
                  disabled={imageBusy || isSubmitting}
                  onClick={() => removePending(index)}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="O'chirish"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            {totalImages < 10 && (
              <label
                className={cn(
                  "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                )}
              >
                <ImagePlus className="size-5" />
                <span className="text-[11px]">Qo&apos;shish</span>
                <input
                  type="file"
                  accept={RASTER_IMAGE_MIME_TYPES.join(",")}
                  multiple
                  disabled={imageBusy || isSubmitting}
                  className="hidden"
                  onChange={onFilesSelected}
                />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="font-medium">Aloqa</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+998 90 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                {...register("telegram")}
                placeholder="@username"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {totalImages > 0 && (
            <Badge variant="secondary">{totalImages} ta rasm</Badge>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={imageBusy || isSubmitting}
              onClick={() => router.back()}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isSubmitting || imageBusy}>
              {(isSubmitting || imageBusy) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isEdit ? "Saqlash" : "E'lon qilish"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
