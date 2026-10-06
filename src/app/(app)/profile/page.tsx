import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth/dal";
import { ProfileView } from "@/features/profile/components/profile-view";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <ProfileView
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
      profile={{
        university: user.profile?.university ?? null,
        faculty: user.profile?.faculty ?? null,
        course: user.profile?.course ?? null,
        group: user.profile?.group ?? null,
        bio: user.profile?.bio ?? null,
      }}
    />
  );
}
