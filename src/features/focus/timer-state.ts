import { z } from "zod";
import { POMODORO_MODES } from "@/lib/constants";
import { studySessionSchema } from "./schema";

export const timerStateSchema = z.object({
  version: z.literal(1),
  modeId: z.string().refine((id) => id === "CUSTOM" || POMODORO_MODES.some((mode) => mode.id === id)),
  customWork: z.string().max(4), customBreak: z.string().max(4),
  phase: z.enum(["work", "break"]), running: z.boolean(),
  remaining: z.number().finite().min(0).max(180 * 60_000),
  endsAt: z.number().finite().nullable(),
  completed: z.number().int().nonnegative(), subjectId: z.string().max(200),
  sessionId: z.string().uuid().nullable(),
  pending: studySessionSchema.extend({ sessionId: z.string().uuid(), endedAt: z.string().datetime() }).nullable(),
});
export type TimerState = z.infer<typeof timerStateSchema>;

export function initialTimerState(): TimerState {
  return { version: 1, modeId: POMODORO_MODES[0].id, customWork: "25", customBreak: "5", phase: "work", running: false, remaining: POMODORO_MODES[0].work * 60_000, endsAt: null, completed: 0, subjectId: "none", sessionId: null, pending: null };
}
export function parseMinutes(value: string, max: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}
export function timerConfig(state: TimerState) {
  return state.modeId === "CUSTOM"
    ? { work: parseMinutes(state.customWork, 180), break: parseMinutes(state.customBreak, 60) }
    : POMODORO_MODES.find((mode) => mode.id === state.modeId) ?? POMODORO_MODES[0];
}
export function restoreTimer(raw: string | null): TimerState {
  try {
    const parsed = timerStateSchema.safeParse(JSON.parse(raw ?? "null"));
    if (parsed.success && (!parsed.data.running || (parsed.data.endsAt !== null && parsed.data.sessionId !== null))) return parsed.data;
  } catch { /* A corrupt or outdated snapshot starts a fresh timer. */ }
  return initialTimerState();
}
export function remainingTime(state: TimerState, now: number) {
  return state.running && state.endsAt !== null ? Math.max(0, state.endsAt - now) : state.remaining;
}
export function finishTimer(state: TimerState, now: number): TimerState {
  if (!state.running || state.endsAt === null || state.endsAt > now) return state;
  const config = timerConfig(state);
  const phase = state.phase === "work" ? "break" : "work";
  // Completing a phase pauses the next one. Time away never fabricates work.
  return { ...state, phase, running: false, endsAt: null, sessionId: null,
    remaining: (phase === "work" ? config.work : config.break) * 60_000,
    pending: state.phase === "work" && state.sessionId ? {
      sessionId: state.sessionId, subjectId: state.subjectId === "none" ? null : state.subjectId,
      durationMin: config.work, mode: state.modeId, endedAt: new Date(state.endsAt).toISOString(),
    } : state.pending };
}
