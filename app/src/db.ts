import Dexie, { type Table } from "dexie";

export type Unit = "kg" | "lb";

export interface SetEntry {
  weight?: number;
  reps?: number;
  seconds?: number;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  /** Rep target carried over from a routine, e.g. "8-12". */
  goal?: string;
  sets: SetEntry[];
}

export interface Workout {
  id?: number;
  name: string;
  routineId?: number;
  unit: Unit;
  startedAt: number;
  /** Unset while the workout is in progress. */
  finishedAt?: number;
  exercises: WorkoutExercise[];
}

export interface RoutineItem {
  exerciseId: string;
  sets: number;
  reps: string;
}

export interface Routine {
  id?: number;
  name: string;
  items: RoutineItem[];
  updatedAt: number;
}

export interface Settings {
  id: "me";
  unit: Unit;
  restSeconds: number;
}

export const DEFAULT_SETTINGS: Settings = { id: "me", unit: "kg", restSeconds: 90 };

class LiftDB extends Dexie {
  workouts!: Table<Workout, number>;
  routines!: Table<Routine, number>;
  settings!: Table<Settings, string>;

  constructor() {
    super("liftlog");
    this.version(1).stores({
      workouts: "++id, startedAt, finishedAt",
      routines: "++id, updatedAt",
      settings: "id",
    });
  }
}

export const db = new LiftDB();

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get("me")) ?? DEFAULT_SETTINGS;
}

export async function activeWorkout(): Promise<Workout | undefined> {
  // finishedAt is not indexed for undefined values, so filter in memory.
  return db.workouts.filter((w) => w.finishedAt === undefined).first();
}

export async function exportAll(): Promise<string> {
  const [workouts, routines, settings] = await Promise.all([
    db.workouts.toArray(),
    db.routines.toArray(),
    db.settings.toArray(),
  ]);
  return JSON.stringify({ app: "liftlog", version: 1, exportedAt: new Date().toISOString(), workouts, routines, settings });
}

export async function importAll(json: string): Promise<{ workouts: number; routines: number }> {
  const data = JSON.parse(json);
  if (data?.app !== "liftlog") throw new Error("Not a LiftLog backup file");
  await db.transaction("rw", db.workouts, db.routines, db.settings, async () => {
    await Promise.all([db.workouts.clear(), db.routines.clear(), db.settings.clear()]);
    await db.workouts.bulkAdd(data.workouts ?? []);
    await db.routines.bulkAdd(data.routines ?? []);
    await db.settings.bulkAdd(data.settings ?? []);
  });
  return { workouts: data.workouts?.length ?? 0, routines: data.routines?.length ?? 0 };
}

const LB_PER_KG = 2.20462;
export function convert(weight: number, from: Unit, to: Unit): number {
  if (from === to) return weight;
  const v = from === "kg" ? weight * LB_PER_KG : weight / LB_PER_KG;
  return Math.round(v * 10) / 10;
}
