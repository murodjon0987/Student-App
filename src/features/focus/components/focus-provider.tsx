"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveStudySession } from "../actions";
import { finishTimer, initialTimerState, remainingTime, restoreTimer, timerConfig, type TimerState } from "../timer-state";

type TimerContextValue = {
  state: TimerState; remaining: number; ready: boolean; saving: boolean; saveError: string | null;
  configure: (values: Partial<Pick<TimerState, "modeId" | "customWork" | "customBreak" | "subjectId">>) => void;
  toggle: () => void; reset: () => void; retry: () => void;
};
const TimerContext = React.createContext<TimerContextValue | null>(null);

export function FocusProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const router = useRouter();
  const key = `studentapp:focus:v1:${userId}`;
  const [state, setState] = React.useState(initialTimerState);
  const current = React.useRef(state);
  const [ready, setReady] = React.useState(false);
  const [now, setNow] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [attempt, retry] = React.useReducer((value) => value + 1, 0);
  const savingRef = React.useRef(false);

  const commit = React.useCallback((next: TimerState) => {
    current.current = next;
    setState(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Timer still works when storage is unavailable. */ }
  }, [key]);

  React.useEffect(() => {
    let snapshot = initialTimerState();
    try { snapshot = restoreTimer(localStorage.getItem(key)); } catch { /* Storage may be disabled. */ }
    commit(snapshot);
    setNow(Date.now());
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = restoreTimer(event.newValue);
      current.current = next;
      setState(next);
    };
    window.addEventListener("storage", sync);
    const reconnect = () => retry();
    window.addEventListener("online", reconnect);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("online", reconnect); };
  }, [key, commit]);

  React.useEffect(() => {
    if (!ready || !state.running) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      const next = finishTimer(current.current, time);
      if (next !== current.current) {
        const wasWork = current.current.phase === "work";
        commit(next);
        toast.success(wasWork ? "Ish yakunlandi. Tanaffusni boshlashingiz mumkin." : "Tanaffus tugadi. Ishni boshlashingiz mumkin.");
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [ready, state.running, commit]);

  React.useEffect(() => {
    const pending = state.pending;
    if (!ready || !pending || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    void (async () => {
      try {
        const result = await saveStudySession(pending);
        if (!result.success) throw new Error(result.error);
        if (current.current.pending?.sessionId === pending.sessionId) {
          commit({ ...current.current, pending: null, completed: current.current.completed + 1 });
        }
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sessiyani saqlab bo'lmadi";
        setSaveError(message);
        toast.error(message);
      } finally { savingRef.current = false; setSaving(false); }
    })();
  }, [state.pending, ready, attempt, commit, router]);

  function configure(values: Parameters<TimerContextValue["configure"]>[0]) {
    const prev = current.current;
    if (!ready || prev.running || prev.pending) return;
    const next = { ...prev, ...values };
    if (values.modeId !== undefined || values.customWork !== undefined || values.customBreak !== undefined) {
      next.phase = "work";
      next.remaining = timerConfig(next).work * 60_000;
      next.sessionId = null;
    }
    commit(next);
  }
  function toggle() {
    const prev = current.current;
    if (!ready || prev.pending) return;
    const config = timerConfig(prev);
    if (config.work < 1 || config.break < 1) { toast.error("Kamida 1 daqiqa kiriting"); return; }
    const time = Date.now();
    setNow(time);
    if (prev.running) {
      const finished = finishTimer(prev, time);
      commit(finished !== prev ? finished : { ...prev, running: false, endsAt: null, remaining: remainingTime(prev, time) });
    } else {
      commit({ ...prev, running: true, endsAt: time + prev.remaining, sessionId: prev.sessionId ?? crypto.randomUUID() });
    }
  }
  function reset() {
    const prev = current.current;
    if (!ready || prev.pending) return;
    commit({ ...prev, phase: "work", running: false, endsAt: null, remaining: timerConfig(prev).work * 60_000, sessionId: null });
  }
  return <TimerContext.Provider value={{ state, remaining: remainingTime(state, now), ready, saving, saveError, configure, toggle, reset, retry }}>{children}</TimerContext.Provider>;
}

export function useFocusTimer() {
  const value = React.useContext(TimerContext);
  if (!value) throw new Error("FocusTimer requires FocusProvider");
  return value;
}
