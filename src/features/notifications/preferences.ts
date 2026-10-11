import type { Prisma } from "@prisma/client";

// A missing profile follows the default setting (enabled).
export const notificationRecipientsWhere: Prisma.UserWhereInput = {
  OR: [
    { profile: { is: null } },
    { profile: { is: { notificationsEnabled: true } } },
  ],
};
