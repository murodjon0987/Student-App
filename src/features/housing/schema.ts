import { z } from "zod";

export const HOUSING_TYPES = [
  "APARTMENT",
  "ROOM",
  "HOUSE",
  "DORMITORY",
  "SHARED",
] as const;

export const HOUSING_STATUSES = ["ACTIVE", "RENTED", "ARCHIVED"] as const;

export const HOUSING_CURRENCIES = ["UZS", "USD"] as const;

export const HOUSING_AMENITIES = [
  "WIFI",
  "FURNITURE",
  "AC",
  "WASHING_MACHINE",
  "KITCHEN",
  "HEATING",
  "PARKING",
  "ELEVATOR",
  "SECURITY",
  "BALCONY",
  "GAS",
  "REFRIGERATOR",
] as const;

export type HousingType = (typeof HOUSING_TYPES)[number];
export type HousingStatus = (typeof HOUSING_STATUSES)[number];
export type HousingCurrency = (typeof HOUSING_CURRENCIES)[number];
export type HousingAmenity = (typeof HOUSING_AMENITIES)[number];

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  APARTMENT: "Kvartira",
  ROOM: "Xona",
  HOUSE: "Hovli/uy",
  DORMITORY: "Yotoqxona",
  SHARED: "Birgalikda",
};

export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  ACTIVE: "Aktiv",
  RENTED: "Ijaraga berildi",
  ARCHIVED: "Arxivlangan",
};

export const HOUSING_AMENITY_LABELS: Record<HousingAmenity, string> = {
  WIFI: "Wi-Fi",
  FURNITURE: "Mebel",
  AC: "Konditsioner",
  WASHING_MACHINE: "Kir yuvish mashinasi",
  KITCHEN: "Oshxona",
  HEATING: "Isitish",
  PARKING: "Avtoturargoh",
  ELEVATOR: "Lift",
  SECURITY: "Qo'riqlash",
  BALCONY: "Balkon",
  GAS: "Gaz",
  REFRIGERATOR: "Muzlatgich",
};

export const housingSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(3, { error: "Sarlavha kamida 3 ta belgidan iborat bo'lsin" })
    .max(120, { error: "Sarlavha juda uzun" }),
  description: z.string().trim().max(3000).optional(),
  type: z.enum(HOUSING_TYPES),
  price: z.number({ error: "Narxni kiriting" }).int().min(0, {
    error: "Narx noto'g'ri",
  }),
  currency: z.enum(HOUSING_CURRENCIES),
  rooms: z.number({ error: "Xonalar sonini kiriting" }).int().min(1).max(20),
  area: z.number().min(0).max(2000).optional(),
  floor: z.number().int().min(-5).max(200).optional(),
  totalFloors: z.number().int().min(1).max(200).optional(),
  city: z.string().trim().min(1, { error: "Shaharni kiriting" }).max(80),
  district: z.string().trim().max(80).optional(),
  address: z.string().trim().max(160).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().trim().max(40).optional(),
  telegram: z.string().trim().max(80).optional(),
  amenities: z.array(z.enum(HOUSING_AMENITIES)),
  status: z.enum(HOUSING_STATUSES),
});

export type HousingInput = z.infer<typeof housingSchema>;
