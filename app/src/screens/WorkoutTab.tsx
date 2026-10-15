import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { activeWorkout, db } from "../db";
import { getExercise } from "../exercises";
import { fmtDate, startOfWeek, workoutVolume } from "../stats";
import { defaultWorkoutName, startWorkout } from "../workouts";
import { useApp } from "../context";
import { Sheet } from "../components/Sheet";
import { ActiveWorkout } from "./ActiveWorkout";
import { GenerateSheet } from "./GenerateSheet";
import { WorkoutSummary } from "./WorkoutSummary";

export function WorkoutTab() {
  const active = useLiveQuery(() => activeWorkout().then((w) => w ?? null), []);
  const [summaryId, setSummaryId] = useState<number | null>(null);

  if (active === undefined) return null;
  return (
    <>
      {active ? <ActiveWorkout workout={active} onFinished={setSummaryId} /> : <Home />}
      {summaryId != null && (
        <Sheet title="Workout complete" onClose={() => setSummaryId(null)}>
          <WorkoutSummary id={summaryId} />
        </Sheet>
      )}
    </>
  );
}

function Home() {
  const { settings, setTab } = useApp();
  const routines = useLiveQuery(() => db.routines.orderBy("updatedAt").reverse().toArray(), []) ?? [];
  const recent = useLiveQuery(() => db.workouts.orderBy("startedAt").reverse().limit(4).toArray(), []) ?? [];
  const weekCount = useLiveQuery(() => db.workouts.where("startedAt").aboveOrEqual(startOfWeek(Date.now())).count(), []) ?? 0;
  const [generating, setGenerating] = useState(false);

  return (
    <div className="stack">
      <section className="hero card">
        <p className="muted">This week</p>
        <p className="hero-num">
          {weekCount} <span>workout{weekCount === 1 ? "" : "s"}</span>
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => startWorkout(defaultWorkoutName())}>
            Start empty workout
          </button>
          <button className="btn" onClick={() => setGenerating(true)}>
            Generate
          </button>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Start a routine</h2>
          <button className="link" onClick={() => setTab("routines")}>
            Manage
          </button>
        </div>
        {routines.length === 0 ? (
          <p className="muted card">No routines yet. Build one in Routines, or generate a workout and save it.</p>
        ) : (
          <ul className="cards">
            {routines.map((r) => (
              <li key={r.id} className="card routine-card">
                <div>
                  <strong>{r.name}</strong>
                  <p className="muted small clamp">{r.items.map((i) => getExercise(i.exerciseId)?.name).join(", ")}</p>
                </div>
                <button className="btn primary small" onClick={() => startWorkout(r.name, r.items, r.id)}>
                  Start
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Recent</h2>
            <button className="link" onClick={() => setTab("progress")}>
              All history
            </button>
          </div>
          <ul className="cards">
            {recent.map((w) => (
              <li key={w.id} className="card">
                <strong>{w.name}</strong>
                <p className="muted small">
                  {fmtDate(w.startedAt)} · {w.exercises.length} exercises · {workoutVolume(w, settings.unit).toLocaleString()} {settings.unit}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {generating && (
        <Sheet title="Generate workout" onClose={() => setGenerating(false)}>
          <GenerateSheet onDone={() => setGenerating(false)} />
        </Sheet>
      )}
    </div>
  );
}
