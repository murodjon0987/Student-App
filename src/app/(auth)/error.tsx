"use client";

import { ErrorRecovery, type ErrorRecoveryProps } from "@/components/error-recovery";

export default function AuthError(props: ErrorRecoveryProps) {
  return <ErrorRecovery {...props} />;
}
