"use client";

import * as React from "react";
import { Timer } from "lucide-react";

function diff(target: Date) {
  const total = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  return {
    total,
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function NextClassCountdown({
  title,
  startTime,
  room,
}: {
  title: string;
  startTime: string;
  room?: string | null;
}) {
  const [state, setState] = React.useState(() => {
    const [h, m] = startTime.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    return { target, ...diff(target) };
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => ({ ...prev, ...diff(prev.target) }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Timer className="size-3.5" /> Keyingi dars
      </div>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">
        {startTime}
        {room ? ` · ${room}` : ""}
      </p>
      <div className="mt-3 flex items-center gap-2 font-mono text-2xl font-bold tabular-nums">
        <span>{pad(state.hours)}</span>
        <span className="text-muted-foreground">:</span>
        <span>{pad(state.minutes)}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-primary">{pad(state.seconds)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">darsgacha qoldi</p>
    </div>
  );
}

export function DeadlineCountdown({
  target,
  className,
}: {
  target: Date | string;
  className?: string;
}) {
  const [state, setState] = React.useState(() => diff(new Date(target)));

  React.useEffect(() => {
    const timer = setInterval(() => setState(diff(new Date(target))), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const overdue = state.total <= 0;
  if (overdue) {
    return <span className={className}>Muddati o'tdi</span>;
  }

  const days = Math.floor(state.hours / 24);
  return (
    <span className={className}>
      {days > 0 && `${days} kun `}
      {pad(state.hours % 24)}:{pad(state.minutes)}:{pad(state.seconds)}
    </span>
  );
}
