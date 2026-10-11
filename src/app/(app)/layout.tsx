import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { FocusProvider } from "@/features/focus/components/focus-provider";

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
    <FocusProvider key={userId} userId={userId}><AppShell
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
    </AppShell></FocusProvider>
  );
}
