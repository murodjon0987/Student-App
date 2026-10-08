"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Coffee,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POMODORO_MODES } from "@/lib/constants";
import { minutesToHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveStudySession } from "@/features/focus/actions";

type Phase = "work" | "break";

interface Props {
  subjects: { id: string; name: string }[];
}

const RADIUS = 110;
const CIRC = 2 * Math.PI * RADIUS;

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function FocusTimer({ subjects }: Props) {
  const router = useRouter();

  const [modeId, setModeId] = React.useState<string>(POMODORO_MODES[0].id);
  const [customWork, setCustomWork] = React.useState(25);
  const [customBreak, setCustomBreak] = React.useState(5);
  const [phase, setPhase] = React.useState<Phase>("work");
  const [running, setRunning] = React.useState(false);
  const [remaining, setRemaining] = React.useState(
    POMODORO_MODES[0].work * 60_000
  );
  const [completed, setCompleted] = React.useState(0);
  const [subjectId, setSubjectId] = React.useState("none");

  const endsAtRef = React.useRef<number | null>(null);
  const runningRef = React.useRef(false);

  React.useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const config = React.useMemo(() => {
    if (modeId === "CUSTOM") {
      return { work: customWork, break: customBreak, label: "Custom" };
    }
    const found =
      POMODORO_MODES.find((m) => m.id === modeId) ?? POMODORO_MODES[0];
    return { work: found.work, break: found.break, label: found.label };
  }, [modeId, customWork, customBreak]);

  React.useEffect(() => {
    if (runningRef.current) return;
    setRemaining((phase === "work" ? config.work : config.break) * 60_000);
    endsAtRef.current = null;
  }, [config.work, config.break, phase]);

  const completePhase = React.useCallback(async () => {
    if (phase === "work") {
      const minutes = config.work;
      const result = await saveStudySession({
        subjectId: subjectId === "none" ? null : subjectId,
        durationMin: minutes,
        mode: modeId,
      });
      if (!result.success) {
        toast.error(result.error);
      } else {
        setCompleted((count) => count + 1);
        toast.success(`Ish yakunlandi: ${minutesToHours(minutes)}`);
        router.refresh();
      }

      const breakMs = config.break * 60_000;
      setPhase("break");
      endsAtRef.current = Date.now() + breakMs;
      setRemaining(breakMs);
    } else {
      toast.success("Tanaffus tugadi. Ishga qaytamiz!");
      const workMs = config.work * 60_000;
      setPhase("work");
      endsAtRef.current = Date.now() + workMs;
      setRemaining(workMs);
    }
  }, [phase, config.work, config.break, subjectId, modeId, router]);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const endsAt = endsAtRef.current;
      if (endsAt == null) return;
      const left = endsAt - Date.now();
      if (left <= 0) {
        window.clearInterval(id);
        void completePhase();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, completePhase]);

  function toggle() {
    if (running) {
      setRunning(false);
      endsAtRef.current = null;
      return;
    }
    endsAtRef.current = Date.now() + remaining;
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setPhase("work");
    setRemaining(config.work * 60_000);
    endsAtRef.current = null;
  }

  function chooseMode(id: string) {
    setModeId(id);
    setPhase("work");
  }

  const isWork = phase === "work";
  const phaseMs = (isWork ? config.work : config.break) * 60_000;
  const progress =
    phaseMs > 0 ? Math.min(1, Math.max(0, 1 - remaining / phaseMs)) : 0;
  const dashoffset = CIRC * (1 - progress);

  return (
    <Card>
      <CardContent className="space-y-6 pt-5">
        <div className="flex flex-wrap gap-2">
          {POMODORO_MODES.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={modeId === item.id ? "default" : "outline"}
              disabled={running}
              onClick={() => chooseMode(item.id)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={modeId === "CUSTOM" ? "default" : "outline"}
            disabled={running}
            onClick={() => chooseMode("CUSTOM")}
          >
            Custom
          </Button>
        </div>

        {modeId === "CUSTOM" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customWork" className="text-xs">
                Ish (daqiqa)
              </Label>
              <Input
                id="customWork"
                type="number"
                min={1}
                max={180}
                value={customWork}
                disabled={running}
                onChange={(event) =>
                  setCustomWork(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customBreak" className="text-xs">
                Tanaffus (daqiqa)
              </Label>
              <Input
                id="customBreak"
                type="number"
                min={1}
                max={60}
                value={customBreak}
                disabled={running}
                onChange={(event) =>
                  setCustomBreak(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </div>
          </div>
        )}

        <div className="relative mx-auto flex size-56 sm:size-64 items-center justify-center">
          <svg className="size-56 sm:size-64 -rotate-90" viewBox="0 0 240 240">
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              fill="none"
              strokeWidth="12"
              className="stroke-muted"
            />
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashoffset}
              className={cn(
                "transition-[stroke-dashoffset] duration-300 ease-linear",
                isWork ? "stroke-primary" : "stroke-emerald-500"
              )}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
                isWork ? "text-primary" : "text-emerald-500"
              )}
            >
              {isWork ? (
                <BookOpen className="size-3.5" />
              ) : (
                <Coffee className="size-3.5" />
              )}
              {isWork ? "Ish bosqichi" : "Tanaffus"}
            </span>
            <span className="mt-1 text-5xl font-bold tabular-nums tracking-tight">
              {formatClock(remaining)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {config.work} / {config.break} daqiqa
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Fan (ixtiyoriy)</Label>
          <Select
            value={subjectId}
            onValueChange={setSubjectId}
            disabled={running}
          >
            <SelectTrigger>
              <SelectValue placeholder="Fan tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanlanmagan</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button size="lg" className="min-w-32" onClick={toggle}>
            {running ? (
              <>
                <Pause className="size-4" /> To&apos;xtatish
              </>
            ) : (
              <>
                <Play className="size-4" /> Boshlash
              </>
            )}
          </Button>
          <Button size="lg" variant="outline" onClick={reset}>
            <RotateCcw className="size-4" /> Qayta tiklash
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Yakunlangan sessiyalar:
          <span className="font-semibold text-foreground">{completed}</span> ta
        </div>
      </CardContent>
    </Card>
  );
}
