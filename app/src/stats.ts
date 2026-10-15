import { convert, type SetEntry, type Unit, type Workout } from "./db";
import { getExercise } from "./exercises";

/** Epley estimated one-rep max. Only meaningful for sets of 1-12 reps. */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
}

export const doneSets = (sets: SetEntry[]) => sets.filter((s) => s.done);

export function setVolume(s: SetEntry): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

export function workoutVolume(w: Workout, unit: Unit): number {
  let v = 0;
  for (const ex of w.exercises) for (const s of doneSets(ex.sets)) v += convert(setVolume(s), w.unit, unit);
  return Math.round(v);
}

export interface SessionPoint {
  workoutId: number;
  date: number;
  sets: SetEntry[];
  bestE1rm: number;
  topWeight: number;
  totalReps: number;
  totalSeconds: number;
  volume: number;
}

/** Per-session summary of one exercise across finished workouts, oldest first, in the given unit. */
export function exerciseHistory(workouts: Workout[], exerciseId: string, unit: Unit): SessionPoint[] {
  const out: SessionPoint[] = [];
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const sets = doneSets(ex.sets).map((s) => ({ ...s, weight: s.weight != null ? convert(s.weight, w.unit, unit) : undefined }));
      if (!sets.length) continue;
      out.push({
        workoutId: w.id!,
        date: w.startedAt,
        sets,
        bestE1rm: Math.max(...sets.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0))),
        topWeight: Math.max(...sets.map((s) => s.weight ?? 0)),
        totalReps: sets.reduce((a, s) => a + (s.reps ?? 0), 0),
        totalSeconds: sets.reduce((a, s) => a + (s.seconds ?? 0), 0),
        volume: sets.reduce((a, s) => a + setVolume(s), 0),
      });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

export interface PR {
  exerciseId: string;
  kind: "e1RM" | "weight" | "reps" | "time";
  value: number;
  date: number;
}

/** Best result per exercise. For weighted lifts: e1RM; bodyweight: max reps; timed: longest set. */
export function personalRecords(workouts: Workout[], unit: Unit): PR[] {
  const best = new Map<string, PR>();
  const finished = workouts.filter((w) => w.finishedAt).sort((a, b) => a.startedAt - b.startedAt);
  for (const w of finished) {
    for (const ex of w.exercises) {
      const info = getExercise(ex.exerciseId);
      for (const s of doneSets(ex.sets)) {
        let pr: PR | null = null;
        if (info?.log === "time") pr = { exerciseId: ex.exerciseId, kind: "time", value: s.seconds ?? 0, date: w.startedAt };
        else if (s.weight && s.weight > 0)
          pr = { exerciseId: ex.exerciseId, kind: "e1RM", value: e1rm(convert(s.weight, w.unit, unit), s.reps ?? 0), date: w.startedAt };
        else pr = { exerciseId: ex.exerciseId, kind: "reps", value: s.reps ?? 0, date: w.startedAt };
        const cur = best.get(ex.exerciseId);
        if (pr.value > 0 && (!cur || pr.value > cur.value || (cur.kind === "reps" && pr.kind === "e1RM"))) best.set(ex.exerciseId, pr);
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date - a.date);
}

/** PRs set in `workout` compared with everything before it. */
export function newPRsIn(workout: Workout, all: Workout[], unit: Unit): PR[] {
  const before = all.filter((w) => w.finishedAt && w.id !== workout.id && w.startedAt < workout.startedAt);
  const prev = new Map(personalRecords(before, unit).map((p) => [p.exerciseId, p]));
  const now = personalRecords([...before, { ...workout, finishedAt: workout.finishedAt ?? Date.now() }], unit);
  return now.filter((p) => {
    if (p.date !== workout.startedAt) return false;
    const old = prev.get(p.exerciseId);
    return !!old && (p.value > old.value || (old.kind === "reps" && p.kind === "e1RM"));
  });
}

export function startOfWeek(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.getTime();
}

export interface WeekBucket {
  week: number;
  workouts: number;
  volume: number;
}

export function weeklySummary(workouts: Workout[], unit: Unit, weeks = 12): WeekBucket[] {
  const thisWeek = startOfWeek(Date.now());
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    buckets.push({ week: d.getTime(), workouts: 0, volume: 0 });
  }
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const b = buckets.find((x) => x.week === startOfWeek(w.startedAt));
    if (b) {
      b.workouts++;
      b.volume += workoutVolume(w, unit);
    }
  }
  return buckets;
}

/** Completed working sets per target muscle since `since`. */
export function setsPerMuscle(workouts: Workout[], since: number): [string, number][] {
  const m = new Map<string, number>();
  for (const w of workouts) {
    if (!w.finishedAt || w.startedAt < since) continue;
    for (const ex of w.exercises) {
      const t = getExercise(ex.exerciseId)?.target;
      if (t) m.set(t, (m.get(t) ?? 0) + doneSets(ex.sets).length);
    }
  }
  return [...m.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
}

export function formatSet(s: SetEntry, unit: Unit): string {
  if (s.seconds != null && s.reps == null) return formatDuration(s.seconds);
  if (s.weight) return `${s.weight}${unit} × ${s.reps ?? 0}`;
  return `${s.reps ?? 0} reps`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
