import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { getExercise, titleCase } from "../exercises";
import { formatDuration, formatSet, fmtDate, newPRsIn, workoutVolume, type PR } from "../stats";
import { useApp } from "../context";

export function formatPR(p: PR, unit: string) {
  if (p.kind === "e1RM") return `${Math.round(p.value)} ${unit} est. 1RM`;
  if (p.kind === "time") return formatDuration(p.value);
  return `${p.value} reps`;
}

/** Summary of a finished workout: totals, PRs, set log, and actions (save as routine, delete). */
export function WorkoutSummary({ id, onDeleted }: { id: number; onDeleted?: () => void }) {
  const { settings } = useApp();
  const data = useLiveQuery(async () => ({ w: await db.workouts.get(id), all: await db.workouts.toArray() }), [id]);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!data) return null;
  const { w, all } = data;
  if (!w) return <p className="muted">Workout deleted.</p>;

  const prs = newPRsIn(w, all, settings.unit);
  const sets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const duration = w.finishedAt ? Math.round((w.finishedAt - w.startedAt) / 1000) : 0;

  async function saveRoutine() {
    await db.routines.add({
      name: w!.name,
      updatedAt: Date.now(),
      items: w!.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length, reps: e.goal ?? "8-12" })),
    });
    setSaved(true);
  }

  return (
    <div className="stack">
      <div>
        <h2 className="detail-title">{w.name}</h2>
        <p className="muted">{fmtDate(w.startedAt)}</p>
      </div>
      <div className="stat-grid">
        <div>
          <span className="stat-num">{formatDuration(duration)}</span>
          <span className="muted small">duration</span>
        </div>
        <div>
          <span className="stat-num">{sets}</span>
          <span className="muted small">sets</span>
        </div>
        <div>
          <span className="stat-num">{workoutVolume(w, settings.unit).toLocaleString()}</span>
          <span className="muted small">{settings.unit} volume</span>
        </div>
      </div>

      {prs.length > 0 && (
        <div className="card pr-card">
          <h3>🏆 New personal records</h3>
          <ul>
            {prs.map((p) => (
              <li key={p.exerciseId}>
                {titleCase(getExercise(p.exerciseId)?.name ?? p.exerciseId)}: <strong>{formatPR(p, settings.unit)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="history">
        {w.exercises.map((e, i) => (
          <li key={i}>
            <span>{titleCase(getExercise(e.exerciseId)?.name ?? e.exerciseId)}</span>
            <span className="muted">{e.sets.map((s) => formatSet(s, w.unit)).join(", ")}</span>
          </li>
        ))}
      </ul>

      <div className="btn-row">
        {!w.routineId && w.exercises.length > 0 && (
          <button className="btn" disabled={saved} onClick={saveRoutine}>
            {saved ? "Saved as routine" : "Save as routine"}
          </button>
        )}
        {onDeleted &&
          (confirmDelete ? (
            <button
              className="btn danger"
              onClick={async () => {
                await db.workouts.delete(id);
                onDeleted();
              }}
            >
              Really delete?
            </button>
          ) : (
            <button className="btn danger-ghost" onClick={() => setConfirmDelete(true)}>
              Delete workout
            </button>
          ))}
      </div>
    </div>
  );
}
