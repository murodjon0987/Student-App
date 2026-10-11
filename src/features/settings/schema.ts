import { z } from "zod";

export const LANGUAGE_VALUES = ["uz"] as const;
export const THEME_VALUES = ["system", "light", "dark"] as const;

export const settingsSchema = z.object({
  language: z.enum(LANGUAGE_VALUES),
  theme: z.enum(THEME_VALUES),
  notificationsEnabled: z.boolean(),
  monthlyBudget: z
    .number()
    .min(0, { error: "Budjet manfiy bo'lishi mumkin emas" }),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
