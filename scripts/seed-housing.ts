import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LISTINGS = [
  {
    type: "APARTMENT",
    title: "2 xonali kvartira, Chilonzor",
    description:
      "Yangi ta'mirlangan, mebel va texnika bilan. Metro yaqin (5 daqiqa piyoda). Talabalar uchun ideal.",
    price: 3_500_000,
    currency: "UZS",
    rooms: 2,
    area: 58,
    floor: 4,
    totalFloors: 9,
    city: "Toshkent",
    district: "Chilonzor",
    address: "Bunyodkor shoh ko'chasi 12",
    lat: 41.2856,
    lng: 69.2035,
    phone: "+998 90 123 45 67",
    telegram: "@aziz_rent",
    amenities: ["WIFI", "FURNITURE", "KITCHEN", "ELEVATOR", "HEATING"],
    status: "ACTIVE",
  },
  {
    type: "ROOM",
    title: "Xona, universitetga yaqin (Yunusobod)",
    description:
      "3 xonali kvartiraning bitta xonasi. Oshxona va hammom umumiy. Wi-Fi bor.",
    price: 1_200_000,
    currency: "UZS",
    rooms: 1,
    area: 16,
    floor: 2,
    totalFloors: 5,
    city: "Toshkent",
    district: "Yunusobod",
    address: "Amir Temur ko'chasi 108",
    lat: 41.3656,
    lng: 69.288,
    phone: "+998 93 222 33 44",
    telegram: "@dilnoza_room",
    amenities: ["WIFI", "FURNITURE", "KITCHEN", "WASHING_MACHINE"],
    status: "ACTIVE",
  },
  {
    type: "APARTMENT",
    title: "Zamonaviy 1 xonali, TATU yonida",
    description:
      "Talabalar uchun qulay studiya. Markazga va universitetga yaqin.",
    price: 2_800_000,
    currency: "UZS",
    rooms: 1,
    area: 34,
    floor: 7,
    totalFloors: 12,
    city: "Toshkent",
    district: "Mirzo Ulug'bek",
    address: "Amir Temur shoh ko'chasi 33",
    lat: 41.3395,
    lng: 69.3347,
    phone: "+998 97 555 66 77",
    telegram: "@modern_studio",
    amenities: ["WIFI", "AC", "FURNITURE", "ELEVATOR", "SECURITY"],
    status: "ACTIVE",
  },
  {
    type: "HOUSE",
    title: "Hovli, Namangan markazi",
    description:
      "Katta hovli, 3 xona, bog' bor. Oilaviy yoki birgalikda yashash uchun.",
    price: 2_500_000,
    currency: "UZS",
    rooms: 3,
    area: 90,
    floor: 1,
    totalFloors: 1,
    city: "Namangan",
    district: "Markaz",
    address: "Navoiy ko'chasi 45",
    lat: 40.9983,
    lng: 71.6726,
    phone: "+998 91 888 99 00",
    telegram: "@namangan_house",
    amenities: ["GAS", "KITCHEN", "PARKING", "HEATING"],
    status: "ACTIVE",
  },
  {
    type: "APARTMENT",
    title: "2 xonali, Samarqand (Registon yaqinida)",
    description:
      "Tarixiy markazda joylashgan shinam kvartira. Talabalar uchun arzon.",
    price: 180,
    currency: "USD",
    rooms: 2,
    area: 52,
    floor: 3,
    totalFloors: 4,
    city: "Samarqand",
    district: "Registon",
    address: "Registon ko'chasi 7",
    lat: 39.6542,
    lng: 66.9597,
    phone: "+998 94 111 22 33",
    telegram: "@samarkand_flat",
    amenities: ["WIFI", "FURNITURE", "KITCHEN", "AC"],
    status: "ACTIVE",
  },
] as const;

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "demo@student.app" },
    select: { id: true },
  });

  if (!user) {
    console.log("[seed-housing] demo@student.app topilmadi — o'tkazib yuborildi.");
    return;
  }

  const count = await prisma.housingListing.count();
  if (count > 0) {
    console.log(`[seed-housing] Allaqachon ${count} ta e'lon bor — o'tkazib yuborildi.`);
    return;
  }

  await prisma.housingListing.createMany({
    data: LISTINGS.map((listing) => ({
      userId: user.id,
      ...listing,
      amenities: [...listing.amenities],
    })),
  });

  console.log(`[seed-housing] ${LISTINGS.length} ta demo kvartira qo'shildi.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
