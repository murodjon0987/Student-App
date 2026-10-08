"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { initials } from "@/lib/utils";
import { updateProfile } from "@/features/profile/actions";
import { profileSchema, type ProfileInput } from "@/features/profile/schema";

interface Props {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  profile: {
    university: string | null;
    faculty: string | null;
    course: number | null;
    group: string | null;
    bio: string | null;
  };
}

export function ProfileView({ user, profile }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
      university: profile.university ?? "",
      faculty: profile.faculty ?? "",
      course: profile.course,
      group: profile.group ?? "",
      bio: profile.bio ?? "",
    },
  });

  React.useEffect(() => {
    reset({
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
      university: profile.university ?? "",
      faculty: profile.faculty ?? "",
      course: profile.course,
      group: profile.group ?? "",
      bio: profile.bio ?? "",
    });
  }, [user, profile, reset]);

  const name = watch("name");
  const avatarUrl = watch("avatarUrl");

  async function onSubmit(values: ProfileInput) {
    const result = await updateProfile(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Profil saqlandi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Shaxsiy va o'quv ma'lumotlaringizni boshqaring."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asosiy ma&apos;lumotlar</CardTitle>
            <CardDescription>
              Ism, aloqa va o&apos;quv joyingiz haqida ma&apos;lumot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={name || user.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {initials(name || user.name) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-medium">{name || user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ism</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="To'liq ism"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">Universitet</Label>
                <Input
                  id="university"
                  {...register("university")}
                  placeholder="Universitet nomi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty">Fakultet</Label>
                <Input
                  id="faculty"
                  {...register("faculty")}
                  placeholder="Fakultet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Kurs</Label>
                <Input
                  id="course"
                  type="number"
                  min={1}
                  max={6}
                  {...register("course", {
                    setValueAs: (value) =>
                      value === "" || value == null ? null : Number(value),
                  })}
                  placeholder="1"
                />
                {errors.course && (
                  <p className="text-xs text-destructive">
                    {errors.course.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Guruh</Label>
                <Input
                  id="group"
                  {...register("group")}
                  placeholder="Guruh raqami"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                {...register("avatarUrl")}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register("bio")}
                placeholder="O'zingiz haqingizda qisqacha..."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Saqlash
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
