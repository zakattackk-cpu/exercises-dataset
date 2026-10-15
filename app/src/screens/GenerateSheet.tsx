import { useMemo, useState } from "react";
import { db } from "../db";
import { titleCase, useExercises, getExercise } from "../exercises";
import { ALL_TARGETS, DURATIONS, FOCUSES, generateWorkout, rerollItem, type GenOptions, type GeneratedItem } from "../generator";
import { startWorkout } from "../workouts";
import { useApp } from "../context";
import { Thumb } from "../components/ExerciseList";

const EQUIP_KEY = "liftlog.genEquipment";

export function GenerateSheet({ onDone }: { onDone: () => void }) {
  const all = useExercises() ?? [];
  const { showExercise } = useApp();
  const allEquipment = useMemo(() => [...new Set(all.map((e) => e.equipment))].sort(), [all]);

  const [focus, setFocus] = useState("full");
  const [customTargets, setCustomTargets] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [excluded, setExcluded] = useState<string[]>(() => JSON.parse(localStorage.getItem(EQUIP_KEY) ?? "[]"));
  const [showEquip, setShowEquip] = useState(false);
  const [items, setItems] = useState<GeneratedItem[] | null>(null);

  const opts: GenOptions = { focus, customTargets, minutes, equipment: new Set(allEquipment.filter((e) => !excluded.includes(e))) };
  const name = focus === "custom" ? customTargets.map(titleCase).join(" + ") || "Custom" : FOCUSES[focus].label;

  const toggleEquip = (e: string) => {
    const next = excluded.includes(e) ? excluded.filter((x) => x !== e) : [...excluded, e];
    setExcluded(next);
    localStorage.setItem(EQUIP_KEY, JSON.stringify(next));
  };

  return (
    <div className="stack">
      <div>
        <h3>Focus</h3>
        <div className="chips wrap">
          {[...Object.entries(FOCUSES).map(([k, f]) => [k, f.label]), ["custom", "Pick muscles"]].map(([k, label]) => (
            <button key={k} className={`chip btn-chip ${focus === k ? "on" : ""}`} onClick={() => setFocus(k)}>
              {label}
            </button>
          ))}
        </div>
        {focus === "custom" && (
          <div className="chips wrap" style={{ marginTop: 8 }}>
            {ALL_TARGETS.map((t) => (
              <button
                key={t}
                className={`chip btn-chip small ${customTargets.includes(t) ? "on" : ""}`}
                onClick={() => setCustomTargets((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}
              >
                {titleCase(t)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3>Time</h3>
        <div className="chips">
          {Object.keys(DURATIONS).map((m) => (
            <button key={m} className={`chip btn-chip ${minutes === +m ? "on" : ""}`} onClick={() => setMinutes(+m)}>
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <button className="link" onClick={() => setShowEquip(!showEquip)}>
          Equipment: {excluded.length ? `${allEquipment.length - excluded.length} of ${allEquipment.length} types` : "full gym"} {showEquip ? "▴" : "▾"}
        </button>
        {showEquip && (
          <div className="chips wrap" style={{ marginTop: 8 }}>
            {allEquipment.map((e) => (
              <button key={e} className={`chip btn-chip small ${excluded.includes(e) ? "" : "on"}`} onClick={() => toggleEquip(e)}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn primary block" onClick={() => setItems(generateWorkout(all, opts))}>
        {items ? "Regenerate" : "Generate"}
      </button>

      {items && (
        <>
          {items.length === 0 ? (
            <p className="muted">No matching exercises — try allowing more equipment.</p>
          ) : (
            <ul className="rows">
              {items.map((it, i) => {
                const ex = getExercise(it.exerciseId)!;
                return (
                  <li key={i}>
                    <button className="row" onClick={() => showExercise(ex.id)}>
                      <Thumb ex={ex} />
                      <span className="row-main">
                        <span className="row-title">{titleCase(ex.name)}</span>
                        <span className="row-sub">
                          {it.sets} × {it.reps} · {titleCase(ex.target)} · {ex.equipment}
                        </span>
                      </span>
                    </button>
                    <button className="info-btn" aria-label="Swap exercise" title="Swap" onClick={() => setItems(rerollItem(all, items, i, opts))}>
                      ⟳
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {items.length > 0 && (
            <div className="btn-row">
              <button
                className="btn primary"
                onClick={async () => {
                  await startWorkout(name, items);
                  onDone();
                }}
              >
                Start workout
              </button>
              <button
                className="btn"
                onClick={async () => {
                  await db.routines.add({ name, items: items.map(({ exerciseId, sets, reps }) => ({ exerciseId, sets, reps })), updatedAt: Date.now() });
                  onDone();
                }}
              >
                Save as routine
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
