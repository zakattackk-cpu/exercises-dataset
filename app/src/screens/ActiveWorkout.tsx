import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { convert, db, type SetEntry, type Workout } from "../db";
import { getExercise, titleCase } from "../exercises";
import { formatDuration, formatSet } from "../stats";
import { addExercises, lastSetsFor } from "../workouts";
import { rest } from "../rest";
import { useApp } from "../context";
import { Sheet } from "../components/Sheet";
import { ExerciseList, Thumb } from "../components/ExerciseList";
import { NumInput } from "../components/NumInput";

/** Apply a change to the stored workout inside a transaction so rapid edits never clobber each other. */
function mutate(id: number, fn: (w: Workout) => void) {
  return db.transaction("rw", db.workouts, async () => {
    const w = await db.workouts.get(id);
    if (!w) return;
    fn(w);
    await db.workouts.put(w);
  });
}

export function ActiveWorkout({ workout, onFinished }: { workout: Workout; onFinished: (id: number) => void }) {
  const id = workout.id!;
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const elapsed = useElapsed(workout.startedAt);
  const doneCount = workout.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  async function finish() {
    await mutate(id, (w) => {
      w.exercises = w.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
        .filter((e) => e.sets.length > 0);
      w.finishedAt = Date.now();
    });
    rest.stop();
    setFinishing(false);
    onFinished(id);
  }

  async function discard() {
    await db.workouts.delete(id);
    rest.stop();
  }

  return (
    <div className="stack">
      <section className="card workout-head">
        <input
          className="title-input"
          defaultValue={workout.name}
          aria-label="Workout name"
          onBlur={(e) => mutate(id, (w) => void (w.name = e.target.value.trim() || w.name))}
        />
        <p className="muted small">
          {formatDuration(elapsed)} elapsed · {doneCount} set{doneCount === 1 ? "" : "s"} done
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => setFinishing(true)}>
            Finish
          </button>
          <button className="btn danger-ghost" onClick={() => setConfirmDiscard(true)}>
            Discard
          </button>
        </div>
      </section>

      {workout.exercises.map((ex, i) => (
        <ExerciseCard key={`${ex.exerciseId}-${i}`} workout={workout} index={i} />
      ))}

      <button className="btn block dashed" onClick={() => setPicking(true)}>
        + Add exercises
      </button>

      {picking && <PickerSheet onClose={() => setPicking(false)} onAdd={(ids) => addExercises(id, ids)} />}

      {finishing && (
        <Sheet title="Finish workout?" onClose={() => setFinishing(false)}>
          <p>
            {doneCount === 0
              ? "No sets are checked off yet. Finishing now will save an empty workout."
              : `${doneCount} completed set${doneCount === 1 ? "" : "s"} will be saved. Unchecked sets are discarded.`}
          </p>
          <div className="btn-row">
            <button className="btn primary" onClick={finish}>
              Finish & save
            </button>
            <button className="btn" onClick={() => setFinishing(false)}>
              Keep going
            </button>
          </div>
        </Sheet>
      )}
      {confirmDiscard && (
        <Sheet title="Discard workout?" onClose={() => setConfirmDiscard(false)}>
          <p>This deletes the workout in progress and everything logged in it.</p>
          <div className="btn-row">
            <button className="btn danger" onClick={discard}>
              Discard
            </button>
            <button className="btn" onClick={() => setConfirmDiscard(false)}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function ExerciseCard({ workout, index }: { workout: Workout; index: number }) {
  const { settings, showExercise } = useApp();
  const id = workout.id!;
  const we = workout.exercises[index];
  const ex = getExercise(we.exerciseId);
  const last = useLiveQuery(() => lastSetsFor(we.exerciseId), [we.exerciseId]);
  const [menu, setMenu] = useState(false);
  if (!ex) return null;
  const unit = workout.unit;

  const setField = (si: number, patch: Partial<SetEntry>) => mutate(id, (w) => Object.assign(w.exercises[index].sets[si], patch));

  const toggleDone = (si: number) => {
    const s = we.sets[si];
    const done = !s.done;
    mutate(id, (w) => {
      const set = w.exercises[index].sets[si];
      // Checking off an empty set copies the placeholder ("last time") values.
      if (done && ex.log !== "time" && set.reps == null) set.reps = placeholder(si)?.reps;
      if (done && ex.log === "weight" && set.weight == null) set.weight = placeholder(si)?.weight;
      if (done && ex.log === "time" && set.seconds == null) set.seconds = placeholder(si)?.seconds;
      set.done = done;
    });
    if (done) rest.start(settings.restSeconds);
  };

  const placeholder = (si: number): SetEntry | undefined => {
    const p = last?.sets[Math.min(si, (last?.sets.length ?? 1) - 1)];
    return p && { ...p, weight: p.weight != null ? convert(p.weight, last!.unit, unit) : undefined };
  };

  const move = (dir: -1 | 1) =>
    mutate(id, (w) => {
      const j = index + dir;
      if (j < 0 || j >= w.exercises.length) return;
      [w.exercises[index], w.exercises[j]] = [w.exercises[j], w.exercises[index]];
    });

  return (
    <section className="card ex-card">
      <div className="ex-card-head">
        <button className="ex-card-title" onClick={() => showExercise(ex.id)}>
          <Thumb ex={ex} size={44} />
          <span>
            <strong>{titleCase(ex.name)}</strong>
            <span className="muted small block">
              {we.goal ? `Goal ${we.sets.length} × ${we.goal}` : titleCase(ex.target)}
              {last && ` · Last: ${last.sets.map((s) => formatSet(s, last.unit)).join(", ")}`}
            </span>
          </span>
        </button>
        <button className="icon-btn" aria-label="Exercise options" onClick={() => setMenu(!menu)}>
          ⋯
        </button>
      </div>
      {menu && (
        <div className="menu" onClick={() => setMenu(false)}>
          <button onClick={() => move(-1)}>Move up</button>
          <button onClick={() => move(1)}>Move down</button>
          <button className="danger-text" onClick={() => mutate(id, (w) => void w.exercises.splice(index, 1))}>
            Remove
          </button>
        </div>
      )}

      <div className={`set-grid ${ex.log}`}>
        <span className="set-h">Set</span>
        {ex.log === "weight" && <span className="set-h">{unit}</span>}
        {ex.log !== "time" && <span className="set-h">Reps</span>}
        {ex.log === "time" && <span className="set-h">Seconds</span>}
        <span className="set-h" />
        {we.sets.map((s, si) => {
          const ph = placeholder(si);
          return (
            <div className={`set-row ${s.done ? "done" : ""}`} key={si}>
              <span className="set-num">{si + 1}</span>
              {ex.log === "weight" && (
                <NumInput value={s.weight} placeholder={ph?.weight} decimal onChange={(v) => setField(si, { weight: v })} />
              )}
              {ex.log !== "time" && <NumInput value={s.reps} placeholder={ph?.reps} onChange={(v) => setField(si, { reps: v })} />}
              {ex.log === "time" && <NumInput value={s.seconds} placeholder={ph?.seconds} onChange={(v) => setField(si, { seconds: v })} />}
              <button className={`done-btn ${s.done ? "on" : ""}`} aria-label={s.done ? "Mark set not done" : "Mark set done"} onClick={() => toggleDone(si)}>
                ✓
              </button>
            </div>
          );
        })}
      </div>
      <div className="btn-row">
        <button
          className="btn small"
          onClick={() =>
            mutate(id, (w) => {
              const sets = w.exercises[index].sets;
              const prev = sets[sets.length - 1];
              sets.push({ weight: prev?.weight, reps: prev?.reps, seconds: prev?.seconds, done: false });
            })
          }
        >
          + Set
        </button>
        {we.sets.length > 0 && (
          <button className="btn small ghost" onClick={() => mutate(id, (w) => void w.exercises[index].sets.pop())}>
            − Set
          </button>
        )}
      </div>
    </section>
  );
}

export function PickerSheet({ onClose, onAdd, title = "Add exercises" }: { onClose: () => void; onAdd: (ids: string[]) => void; title?: string }) {
  const { showExercise } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <Sheet
      title={title}
      onClose={onClose}
      actions={
        <button
          className="btn primary small"
          disabled={!selected.length}
          onClick={() => {
            onAdd(selected);
            onClose();
          }}
        >
          Add{selected.length ? ` ${selected.length}` : ""}
        </button>
      }
    >
      <ExerciseList selected={new Set(selected)} onToggle={toggle} onOpen={showExercise} />
    </Sheet>
  );
}

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((now - since) / 1000));
}
