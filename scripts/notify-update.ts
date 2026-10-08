import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

async function main() {
  const enabled =
    process.env.VERCEL_ENV === "production" ||
    process.env.NOTIFY_ON_BUILD === "1";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!enabled) {
    console.log(
      "[notify-update] O'tkazib yuborildi (faqat production deploy yoki NOTIFY_ON_BUILD=1 da ishlaydi)."
    );
    return;
  }

  if (!publicKey || !privateKey) {
    console.warn("[notify-update] VAPID kalitlari yo'q, o'tkazib yuborildi.");
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn("[notify-update] DATABASE_URL yo'q, o'tkazib yuborildi.");
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@student.app",
    publicKey,
    privateKey
  );

  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    "dev";

  const payload = JSON.stringify({
    title: "Yangi versiya mavjud",
    body: "Ilova yangilandi. Eng so'nggi imkoniyatlar uchun bosing.",
    url: "/dashboard",
    tag: `update-${version}`,
  });

  const prisma = new PrismaClient();

  try {
    const subscriptions = await prisma.pushSubscription.findMany();
    let sent = 0;
    const expiredIds: string[] = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(subscription.id);
        }
      }
    }

    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
    }

    console.log(
      `[notify-update] version=${version} sent=${sent} removed=${expiredIds.length}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[notify-update] Xatolik:", error);
  // Buildni to'xtatmaymiz.
});
