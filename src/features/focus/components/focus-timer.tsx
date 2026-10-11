"use client";

import { useFocusTimer } from "./focus-provider";
import { parseMinutes, timerConfig } from "../timer-state";
import {
  BookOpen,
  CheckCircle2,
  Coffee,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

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

import { cn } from "@/lib/utils";

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
  const { state, remaining, ready, saving, saveError, configure, toggle, reset, retry } = useFocusTimer();
  const { modeId, customWork, customBreak, phase, running, completed, subjectId } = state;
  const config = timerConfig(state);
  const disabled = !ready || running || Boolean(state.pending);
  const setCustomWork = (customWork: string) => configure({ customWork });
  const setCustomBreak = (customBreak: string) => configure({ customBreak });
  const setSubjectId = (subjectId: string) => configure({ subjectId });
  const chooseMode = (modeId: string) => configure({ modeId });

  const isWork = phase === "work";
  const phaseMs = (isWork ? config.work : config.break) * 60_000;
  const progress =
    phaseMs > 0 ? Math.min(1, Math.max(0, 1 - remaining / phaseMs)) : 0;
  const dashoffset = CIRC * (1 - progress);

  return (
    <Card>
      <CardContent className="space-y-6 pt-5">
        <p className="text-xs text-muted-foreground">Taymer boshqa bo'limda ham davom etadi. Har bosqich tugagach, keyingisini o'zingiz boshlang.</p>
        {state.pending && (
          <div role="status" className="rounded-lg border p-3 text-sm">
            {saving ? "Sessiya saqlanmoqda..." : saveError ?? "Sessiya saqlashni kutmoqda."}
            {!saving && <Button type="button" variant="outline" size="sm" className="ml-2" onClick={retry}>Qayta saqlash</Button>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {POMODORO_MODES.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={modeId === item.id ? "default" : "outline"}
              disabled={disabled}
              onClick={() => chooseMode(item.id)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={modeId === "CUSTOM" ? "default" : "outline"}
            disabled={disabled}
            onClick={() => chooseMode("CUSTOM")}
          >
            Moslashtirish
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
                inputMode="numeric"
                min={1}
                max={180}
                value={customWork}
                disabled={disabled}
                onChange={(event) => setCustomWork(event.target.value)}
                onBlur={() => setCustomWork(String(parseMinutes(customWork, 180)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customBreak" className="text-xs">
                Tanaffus (daqiqa)
              </Label>
              <Input
                id="customBreak"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={customBreak}
                disabled={disabled}
                onChange={(event) => setCustomBreak(event.target.value)}
                onBlur={() =>
                  setCustomBreak(String(parseMinutes(customBreak, 60)))
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
            disabled={disabled}
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

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="min-w-32" disabled={!ready || Boolean(state.pending)} onClick={toggle}>
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
          <Button size="lg" variant="outline" disabled={!ready || Boolean(state.pending)} onClick={reset}>
            <RotateCcw className="size-4" /> Qayta tiklash
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Yakunlangan sessiyalar:
          <span className="font-semibold text-foreground">{completed}</span> ta
        </div>
      </CardContent>
    </Card>
  );
}
