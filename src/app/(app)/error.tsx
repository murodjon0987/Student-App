"use client";

import { ErrorRecovery, type ErrorRecoveryProps } from "@/components/error-recovery";

export default function AppError(props: ErrorRecoveryProps) {
  return <ErrorRecovery {...props} />;
}
