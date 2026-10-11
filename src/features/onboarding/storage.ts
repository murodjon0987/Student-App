export const ONBOARDING_STORAGE_KEY = "student-app.onboarding.v1";
export const INSTALL_HINT_KEY = "student-app.install-hint.v1";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode yoki saqlash bloklanganda jimgina o'tkazib yuboriladi.
  }
}

/** Tanishuv slaydlari ko'rsatilganmi. */
export function isOnboardingDone(): boolean {
  return read(ONBOARDING_STORAGE_KEY) === "done";
}

export function markOnboardingDone(): void {
  write(ONBOARDING_STORAGE_KEY, "done");
}

/** Ilovani o'rnatish eslatmasi ko'rsatilganmi. */
export function isInstallHintDone(): boolean {
  return read(INSTALL_HINT_KEY) === "done";
}

export function markInstallHintDone(): void {
  write(INSTALL_HINT_KEY, "done");
}
