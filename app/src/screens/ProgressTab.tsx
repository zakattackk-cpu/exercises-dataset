import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { getExercise, titleCase } from "../exercises";
import { fmtDate, personalRecords, setsPerMuscle, weeklySummary, workoutVolume } from "../stats";
import { useApp } from "../context";
import { BarChart } from "../components/Charts";
import { Sheet } from "../components/Sheet";
import { Thumb } from "../components/ExerciseList";
import { WorkoutSummary, formatPR } from "./WorkoutSummary";

type View = "overview" | "records" | "history";

export function ProgressTab() {
  const { settings, showExercise } = useApp();
  const workouts = useLiveQuery(() => db.workouts.orderBy("startedAt").reverse().toArray(), []);
  const [view, setView] = useState<View>("overview");
  const [openId, setOpenId] = useState<number | null>(null);
  if (!workouts) return null;

  const finished = workouts.filter((w) => w.finishedAt);
  if (finished.length === 0)
    return <p className="muted card">Finish your first workout and your trends, personal records and history will show up here.</p>;

  const weeks = weeklySummary(finished, settings.unit);
  const muscles = setsPerMuscle(finished, Date.now() - 7 * 864e5);
  const maxMuscle = Math.max(1, ...muscles.map(([, n]) => n));
  const prs = personalRecords(finished, settings.unit);

  return (
    <div className="stack">
      <div className="segmented">
        {(["overview", "records", "history"] as View[]).map((v) => (
          <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
            {titleCase(v)}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <>
          <div className="stat-grid">
            <div>
              <span className="stat-num">{finished.length}</span>
              <span className="muted small">workouts</span>
            </div>
            <div>
              <span className="stat-num">{weeks[weeks.length - 1].workouts}</span>
              <span className="muted small">this week</span>
            </div>
            <div>
              <span className="stat-num">{prs.length}</span>
              <span className="muted small">exercises tracked</span>
            </div>
          </div>
          <div className="card">
            <BarChart label="Workouts per week" bars={weeks.map((w) => ({ x: w.week, y: w.workouts }))} />
          </div>
          <div className="card">
            <BarChart label={`Volume per week (${settings.unit})`} bars={weeks.map((w) => ({ x: w.week, y: w.volume }))} />
          </div>
          <div className="card">
            <h3>Sets per muscle · last 7 days</h3>
            {muscles.length === 0 ? (
              <p className="muted small">No sets in the last 7 days.</p>
            ) : (
              <ul className="meter-list">
                {muscles.map(([m, n]) => (
                  <li key={m}>
                    <span>{titleCase(m)}</span>
                    <span className="meter">
                      <span style={{ width: `${(n / maxMuscle) * 100}%` }} />
                    </span>
                    <span className="num-label">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {view === "records" && (
        <ul className="rows">
          {prs.map((p) => {
            const ex = getExercise(p.exerciseId);
            if (!ex) return null;
            return (
              <li key={p.exerciseId}>
                <button className="row" onClick={() => showExercise(ex.id)}>
                  <Thumb ex={ex} size={44} />
                  <span className="row-main">
                    <span className="row-title">{titleCase(ex.name)}</span>
                    <span className="row-sub">{fmtDate(p.date)}</span>
                  </span>
                  <strong className="pr-value">{formatPR(p, settings.unit)}</strong>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {view === "history" && (
        <ul className="cards">
          {finished.map((w) => (
            <li key={w.id}>
              <button className="card plain block" onClick={() => setOpenId(w.id!)}>
                <strong>{w.name}</strong>
                <span className="muted small block">
                  {fmtDate(w.startedAt)} · {w.exercises.length} exercises · {workoutVolume(w, settings.unit).toLocaleString()} {settings.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId != null && (
        <Sheet title="Workout" onClose={() => setOpenId(null)}>
          <WorkoutSummary id={openId} onDeleted={() => setOpenId(null)} />
        </Sheet>
      )}
    </div>
  );
}
