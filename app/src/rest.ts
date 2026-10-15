import { useEffect, useState, useSyncExternalStore } from "react";

// Rest timer shared across tabs; endsAt survives reloads via localStorage.
const KEY = "liftlog.restEndsAt";
let endsAt: number | null = Number(localStorage.getItem(KEY)) || null;
let total = 0;
const listeners = new Set<() => void>();
let alarm: number | undefined;

function emit() {
  if (endsAt) localStorage.setItem(KEY, String(endsAt));
  else localStorage.removeItem(KEY);
  clearTimeout(alarm);
  if (endsAt && endsAt > Date.now()) alarm = window.setTimeout(ring, endsAt - Date.now());
  listeners.forEach((l) => l());
}

function ring() {
  navigator.vibrate?.([200, 100, 200]);
  try {
    const ctx = new AudioContext();
    for (const [i, f] of [880, 1320].entries()) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.2);
      o.stop(ctx.currentTime + i * 0.2 + 0.2);
    }
  } catch {
    /* audio unavailable */
  }
}

export const rest = {
  start(seconds: number) {
    total = seconds;
    endsAt = Date.now() + seconds * 1000;
    emit();
  },
  add(seconds: number) {
    if (!endsAt) return;
    endsAt += seconds * 1000;
    total += seconds;
    emit();
  },
  stop() {
    endsAt = null;
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Remaining seconds (null when idle) and the timer's total length, re-rendering every 250ms while running. */
export function useRest(): { remaining: number | null; total: number } {
  const end = useSyncExternalStore(subscribe, () => endsAt);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [end]);
  if (!end) return { remaining: null, total };
  const remaining = Math.ceil((end - Date.now()) / 1000);
  return { remaining, total: total || remaining };
}

if (endsAt) emit();
