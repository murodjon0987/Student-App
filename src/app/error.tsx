"use client";

import { ErrorRecovery, type ErrorRecoveryProps } from "@/components/error-recovery";

export default function ErrorPage(props: ErrorRecoveryProps) {
  return <ErrorRecovery {...props} />;
}
