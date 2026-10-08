"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  Globe,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  Trash2,
  UserRoundX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { PushToggle } from "@/features/settings/components/push-toggle";
import {
  deleteAccount,
  deleteAllData,
  updateSettings,
} from "@/features/settings/actions";
import {
  LANGUAGE_VALUES,
  THEME_VALUES,
  settingsSchema,
  type SettingsInput,
} from "@/features/settings/schema";

interface Props {
  email: string;
  profile: {
    language: string;
    theme: string;
    notificationsEnabled: boolean;
    monthlyBudget: number;
  };
  pushEnabled: boolean;
}

const LANGUAGE_OPTIONS: { value: SettingsInput["language"]; label: string }[] =
  [
    { value: "uz", label: "O'zbekcha" },
    { value: "en", label: "English" },
    { value: "ru", label: "Русский" },
  ];

const THEME_OPTIONS: {
  value: SettingsInput["theme"];
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "light", label: "Yorug'", icon: Sun },
  { value: "dark", label: "Qorong'i", icon: Moon },
  { value: "system", label: "Tizim", icon: Monitor },
];

function asLanguage(value: string): SettingsInput["language"] {
  return (LANGUAGE_VALUES as readonly string[]).includes(value)
    ? (value as SettingsInput["language"])
    : "uz";
}

function asTheme(value: string): SettingsInput["theme"] {
  return (THEME_VALUES as readonly string[]).includes(value)
    ? (value as SettingsInput["theme"])
    : "system";
}

export function SettingsView({ email, profile, pushEnabled }: Props) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: asLanguage(profile.language),
      theme: asTheme(profile.theme),
      notificationsEnabled: profile.notificationsEnabled,
      monthlyBudget: profile.monthlyBudget,
    },
  });

  const theme = watch("theme");
  const language = watch("language");
  const notificationsEnabled = watch("notificationsEnabled");

  async function onSubmit(values: SettingsInput) {
    const result = await updateSettings(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Sozlamalar saqlandi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sozlamalar"
        description="Ilova ko'rinishi, til va ma'lumotlarni boshqaring."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4 text-muted-foreground" /> Ko&apos;rinish
            </CardTitle>
            <CardDescription>
              Yorug&apos; yoki qorong&apos;i mavzuni tanlang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full flex-wrap gap-1 rounded-lg border border-border p-1 sm:inline-flex sm:w-auto">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={active ? "secondary" : "ghost"}
                    className={cn("flex-1 sm:flex-none", active && "shadow-sm")}
                    onClick={() => {
                      setValue("theme", option.value, { shouldDirty: true });
                      setTheme(option.value);
                    }}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="size-4 text-muted-foreground" /> Til
            </CardTitle>
            <CardDescription>Interfeys tilini tanlang.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-xs">
            <Select
              value={language}
              onValueChange={(value) =>
                setValue("language", value as SettingsInput["language"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-muted-foreground" /> Bildirishnomalar
            </CardTitle>
            <CardDescription>
              Eslatmalar va muhim xabarlarni olish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Push-bildirishnomalar</p>
                <p className="text-xs text-muted-foreground">
                  Vazifalar, imtihonlar va deadline eslatmalari.
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) =>
                  setValue("notificationsEnabled", checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <Separator />
            <PushToggle initialEnabled={pushEnabled} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-muted-foreground" /> Moliya
            </CardTitle>
            <CardDescription>Oylik budjet chegarasini belgilang.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-xs space-y-2">
            <Label htmlFor="monthlyBudget">Oylik budjet (UZS)</Label>
            <Input
              id="monthlyBudget"
              type="number"
              min={0}
              step={10000}
              {...register("monthlyBudget", {
                setValueAs: (value) =>
                  value === "" || value == null ? 0 : Number(value),
              })}
            />
            {errors.monthlyBudget && (
              <p className="text-xs text-destructive">
                {errors.monthlyBudget.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Sozlamalarni saqlash
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hisob</CardTitle>
          <CardDescription>Hisob ma&apos;lumotlari va sessiya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="accountEmail">Email</Label>
            <Input id="accountEmail" value={email} disabled />
          </div>
          <Separator />
          <Button
            type="button"
            variant="outline"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" /> Chiqish
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="size-4" /> Xavfli zona
          </CardTitle>
          <CardDescription>
            Bu amallar qaytarilmaydi. Ehtiyotkorlik bilan foydalaning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Barcha ma&apos;lumotlarni o&apos;chirish</p>
              <p className="text-xs text-muted-foreground">
                Vazifalar, fanlar, xarajatlar va boshqa barcha yozuvlar
                o&apos;chiriladi. Hisob va profil saqlanadi.
              </p>
            </div>
            <ConfirmDialog
              title="Barcha ma'lumotlarni o'chirish"
              description="Barcha vazifalar, fanlar, xarajatlar, sessiyalar va boshqa yozuvlaringiz butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi."
              confirmLabel="Ha, o'chirish"
              onConfirm={async () => {
                const result = await deleteAllData();
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("Barcha ma'lumotlar o'chirildi");
                  router.refresh();
                }
              }}
              trigger={
                <Button type="button" variant="outline">
                  <Trash2 className="size-4 text-destructive" />
                  Ma&apos;lumotlarni o&apos;chirish
                </Button>
              }
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Hisobni o&apos;chirish</p>
              <p className="text-xs text-muted-foreground">
                Hisobingiz va barcha ma&apos;lumotlaringiz butunlay
                o&apos;chiriladi. Tizimdan chiqarilasiz.
              </p>
            </div>
            <ConfirmDialog
              title="Hisobni o'chirish"
              description="Hisobingiz va unga tegishli barcha ma'lumotlar butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi."
              confirmLabel="Ha, hisobni o'chirish"
              onConfirm={async () => {
                await deleteAccount();
              }}
              trigger={
                <Button type="button" variant="destructive">
                  <UserRoundX className="size-4" />
                  Hisobni o&apos;chirish
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
