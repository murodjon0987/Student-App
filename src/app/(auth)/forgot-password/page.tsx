import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Parolni tiklash" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
