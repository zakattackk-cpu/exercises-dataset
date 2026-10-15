import { useLiveQuery } from "dexie-react-hooks";
import { activeWorkout, db } from "../db";
import { getExercise, titleCase } from "../exercises";
import { exerciseHistory, fmtDate, formatDuration, formatSet } from "../stats";
import { addExercises } from "../workouts";
import { useApp } from "../context";
import { LineChart } from "./Charts";

export function ExerciseDetail({ id }: { id: string }) {
  const ex = getExercise(id);
  const { settings } = useApp();
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const active = useLiveQuery(() => activeWorkout(), []);
  if (!ex) return <p>Exercise not found.</p>;

  const history = exerciseHistory(workouts, id, settings.unit);
  const inActive = active?.exercises.some((e) => e.exerciseId === id);
  const best = history.length
    ? ex.log === "time"
      ? formatDuration(Math.max(...history.flatMap((h) => h.sets.map((s) => s.seconds ?? 0))))
      : ex.log === "weight"
        ? `${Math.round(Math.max(...history.map((h) => h.bestE1rm)))} ${settings.unit} est. 1RM`
        : `${Math.max(...history.flatMap((h) => h.sets.map((s) => s.reps ?? 0)))} reps`
    : null;

  const chart =
    ex.log === "weight"
      ? { label: `Estimated 1RM (${settings.unit})`, points: history.map((h) => ({ x: h.date, y: Math.round(h.bestE1rm * 10) / 10 })) }
      : ex.log === "reps"
        ? { label: "Total reps per session", points: history.map((h) => ({ x: h.date, y: h.totalReps })) }
        : { label: "Total seconds per session", points: history.map((h) => ({ x: h.date, y: h.totalSeconds })) };

  return (
    <div className="detail">
      <img className="gif" src={ex.gif} alt={`${ex.name} demonstration`} width={180} height={180} />
      <h2 className="detail-title">{titleCase(ex.name)}</h2>
      <div className="chips">
        <span className="chip accent">{titleCase(ex.target)}</span>
        {ex.secondary.map((m) => (
          <span key={m} className="chip">{titleCase(m)}</span>
        ))}
        <span className="chip outline">{ex.equipment}</span>
      </div>

      {active && (
        <button className="btn primary block" disabled={inActive} onClick={() => addExercises(active.id!, [id])}>
          {inActive ? "In current workout" : "Add to current workout"}
        </button>
      )}

      <h3>How to</h3>
      <ol className="steps">
        {ex.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      <h3>Your history</h3>
      {history.length === 0 ? (
        <p className="muted">Not logged yet.</p>
      ) : (
        <>
          <p className="stat-line">
            Best: <strong>{best}</strong> · {history.length} session{history.length > 1 ? "s" : ""}
          </p>
          <LineChart {...chart} />
          <ul className="history">
            {[...history].reverse().slice(0, 10).map((h) => (
              <li key={h.workoutId}>
                <span className="muted">{fmtDate(h.date)}</span>
                <span>{h.sets.map((s) => formatSet(s, settings.unit)).join(", ")}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="attribution">Media © Gym visual — gymvisual.com</p>
    </div>
  );
}
