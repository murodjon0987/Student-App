"use client";

import * as React from "react";

import { formatDate, formatUzFullDate } from "@/lib/format";

export function LiveClock() {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) {
    return <div className="h-14 w-44 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="text-right">
      <p className="font-mono text-2xl font-semibold tabular-nums">
        {formatDate(now, "HH:mm:ss")}
      </p>
      <p className="text-xs text-muted-foreground">{formatUzFullDate(now)}</p>
    </div>
  );
}
