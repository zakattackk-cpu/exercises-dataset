import { activeWorkout, db, getSettings, type RoutineItem, type SetEntry, type Workout, type WorkoutExercise } from "./db";
import { getExercise } from "./exercises";

/** Most recent finished sets for an exercise, used to prefill and to show "last time". */
export async function lastSetsFor(exerciseId: string): Promise<{ sets: SetEntry[]; unit: Workout["unit"]; date: number } | null> {
  const ws = await db.workouts.orderBy("startedAt").reverse().toArray();
  for (const w of ws) {
    if (!w.finishedAt) continue;
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    const done = ex?.sets.filter((s) => s.done);
    if (done?.length) return { sets: done, unit: w.unit, date: w.startedAt };
  }
  return null;
}

async function buildExercise(exerciseId: string, setCount = 3, goal?: string): Promise<WorkoutExercise> {
  const last = await lastSetsFor(exerciseId);
  const log = getExercise(exerciseId)?.log ?? "weight";
  const sets: SetEntry[] = Array.from({ length: setCount }, (_, i) => {
    const prev = last?.sets[Math.min(i, last.sets.length - 1)];
    if (log === "time") return { seconds: prev?.seconds, done: false };
    return { weight: log === "weight" ? prev?.weight : undefined, reps: prev?.reps, done: false };
  });
  return { exerciseId, goal, sets };
}

export async function startWorkout(name: string, items: RoutineItem[] = [], routineId?: number): Promise<number> {
  const existing = await activeWorkout();
  if (existing) return existing.id!;
  const { unit } = await getSettings();
  const exercises = await Promise.all(items.map((it) => buildExercise(it.exerciseId, it.sets, it.reps)));
  return db.workouts.add({ name, routineId, unit, startedAt: Date.now(), exercises });
}

export async function addExercises(workoutId: number, ids: string[]) {
  const w = await db.workouts.get(workoutId);
  if (!w) return;
  const added = await Promise.all(ids.map((id) => buildExercise(id)));
  await db.workouts.update(workoutId, { exercises: [...w.exercises, ...added] });
}

export function defaultWorkoutName(t = Date.now()): string {
  const h = new Date(t).getHours();
  return h < 11 ? "Morning workout" : h < 17 ? "Afternoon workout" : "Evening workout";
}
