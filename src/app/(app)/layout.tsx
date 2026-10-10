import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await verifySession();

  const [user, unreadCount] = await Promise.all([
    getCurrentUser(),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        university: user.profile?.university ?? null,
        group: user.profile?.group ?? null,
        unreadCount,
      }}
    >
      {children}
    </AppShell>
  );
}
