import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { activeWorkout, db, type Routine, type RoutineItem } from "../db";
import { getExercise, titleCase } from "../exercises";
import { startWorkout } from "../workouts";
import { useApp } from "../context";
import { Sheet } from "../components/Sheet";
import { Thumb } from "../components/ExerciseList";
import { PickerSheet } from "./ActiveWorkout";

export function RoutinesTab() {
  const routines = useLiveQuery(() => db.routines.orderBy("updatedAt").reverse().toArray(), []) ?? [];
  const active = useLiveQuery(() => activeWorkout(), []);
  const { setTab } = useApp();
  const [editing, setEditing] = useState<Routine | null>(null);

  return (
    <div className="stack">
      <button className="btn primary block" onClick={() => setEditing({ name: "", items: [], updatedAt: Date.now() })}>
        + New routine
      </button>
      {routines.length === 0 && (
        <p className="muted card">
          Routines are reusable templates, e.g. Push / Pull / Legs. Create one here, or use Generate on the Workout tab and save the result.
        </p>
      )}
      <ul className="cards">
        {routines.map((r) => (
          <li key={r.id} className="card">
            <div className="routine-card">
              <button className="plain" onClick={() => setEditing(r)}>
                <strong>{r.name}</strong>
                <span className="muted small block">
                  {r.items.length} exercises · {r.items.reduce((a, i) => a + i.sets, 0)} sets
                </span>
              </button>
              <button
                className="btn primary small"
                disabled={!!active}
                title={active ? "Finish the current workout first" : undefined}
                onClick={async () => {
                  await startWorkout(r.name, r.items, r.id);
                  setTab("workout");
                }}
              >
                Start
              </button>
            </div>
            <ol className="routine-items">
              {r.items.map((it, i) => (
                <li key={i}>
                  {titleCase(getExercise(it.exerciseId)?.name ?? "?")} <span className="muted">{it.sets} × {it.reps}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RoutineEditor({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const { showExercise } = useApp();
  const [name, setName] = useState(routine.name);
  const [items, setItems] = useState<RoutineItem[]>(routine.items);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (i: number, patch: Partial<RoutineItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const j = i + dir;
      if (j < 0 || j >= xs.length) return xs;
      const c = [...xs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  async function save() {
    const r = { ...routine, name: name.trim() || "Untitled routine", items, updatedAt: Date.now() };
    if (r.id) await db.routines.put(r);
    else await db.routines.add(r);
    onClose();
  }

  return (
    <Sheet
      title={routine.id ? "Edit routine" : "New routine"}
      onClose={onClose}
      actions={
        <button className="btn primary small" onClick={save}>
          Save
        </button>
      }
    >
      <div className="stack">
        <input className="title-input" placeholder="Routine name, e.g. Push day" value={name} onChange={(e) => setName(e.target.value)} />
        <ul className="rows">
          {items.map((it, i) => {
            const ex = getExercise(it.exerciseId);
            if (!ex) return null;
            return (
              <li key={`${it.exerciseId}-${i}`} className="routine-edit-row">
                <button className="row" onClick={() => showExercise(ex.id)}>
                  <Thumb ex={ex} size={40} />
                  <span className="row-main">
                    <span className="row-title">{titleCase(ex.name)}</span>
                  </span>
                </button>
                <div className="routine-controls">
                  <label>
                    Sets
                    <input type="number" min={1} max={10} inputMode="numeric" value={it.sets} onChange={(e) => update(i, { sets: Math.max(1, +e.target.value || 1) })} />
                  </label>
                  <label>
                    Reps
                    <input value={it.reps} onChange={(e) => update(i, { reps: e.target.value })} />
                  </label>
                  <button className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
                  <button className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
                  <button className="icon-btn danger-text" aria-label="Remove" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>✕</button>
                </div>
              </li>
            );
          })}
        </ul>
        <button className="btn block dashed" onClick={() => setPicking(true)}>
          + Add exercises
        </button>
        {routine.id &&
          (confirmDelete ? (
            <button
              className="btn danger block"
              onClick={async () => {
                await db.routines.delete(routine.id!);
                onClose();
              }}
            >
              Really delete “{routine.name}”?
            </button>
          ) : (
            <button className="btn danger-ghost block" onClick={() => setConfirmDelete(true)}>
              Delete routine
            </button>
          ))}
      </div>
      {picking && (
        <PickerSheet
          onClose={() => setPicking(false)}
          onAdd={(ids) => setItems((xs) => [...xs, ...ids.map((exerciseId) => ({ exerciseId, sets: 3, reps: getExercise(exerciseId)?.log === "time" ? "30s" : "8-12" }))])}
        />
      )}
    </Sheet>
  );
}
