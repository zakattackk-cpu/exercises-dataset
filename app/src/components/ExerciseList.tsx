import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { titleCase, useExercises, type Exercise } from "../exercises";

const PAGE = 40;

export function Thumb({ ex, size = 52 }: { ex: Exercise; size?: number }) {
  return <img className="thumb" src={ex.image} alt="" width={size} height={size} loading="lazy" />;
}

/** Searchable, filterable exercise list. In picker mode rows toggle selection instead of opening details. */
export function ExerciseList({
  onOpen,
  selected,
  onToggle,
}: {
  onOpen?: (id: string) => void;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
}) {
  const all = useExercises() ?? [];
  const [q, setQ] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  // Exercises used before, most recent first, float to the top when not searching.
  const recent = useLiveQuery(async () => {
    const ws = await db.workouts.orderBy("startedAt").reverse().limit(60).toArray();
    const ids: string[] = [];
    for (const w of ws) for (const e of w.exercises) if (!ids.includes(e.exerciseId)) ids.push(e.exerciseId);
    return ids;
  }, []) ?? [];

  const options = useMemo(() => {
    const u = (k: keyof Exercise) => [...new Set(all.map((e) => e[k] as string))].sort();
    return { bodyPart: u("bodyPart"), equipment: u("equipment"), target: u("target") };
  }, [all]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = all.filter(
      (e) =>
        (!bodyPart || e.bodyPart === bodyPart) &&
        (!equipment || e.equipment === equipment) &&
        (!target || e.target === target) &&
        words.every((w) => e.name.includes(w) || e.target.includes(w) || e.equipment.includes(w)),
    );
    if (words.length) {
      // Prefer names that start with the query, then shorter (more canonical) names.
      const qs = q.toLowerCase().trim();
      return list.sort((a, b) => Number(b.name.startsWith(qs)) - Number(a.name.startsWith(qs)) || a.name.length - b.name.length);
    }
    const rank = new Map(recent.map((id, i) => [id, i]));
    return list.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  }, [all, q, bodyPart, equipment, target, recent]);

  useEffect(() => setLimit(PAGE), [q, bodyPart, equipment, target]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setLimit((l) => l + PAGE), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [results]);

  const recentSet = new Set(recent);

  return (
    <div className="ex-list">
      <div className="filters">
        <input type="search" placeholder="Search 1,324 exercises" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-row">
          <Select label="Body part" value={bodyPart} options={options.bodyPart} onChange={setBodyPart} />
          <Select label="Muscle" value={target} options={options.target} onChange={setTarget} />
          <Select label="Equipment" value={equipment} options={options.equipment} onChange={setEquipment} />
        </div>
        <p className="muted small">{results.length} exercises</p>
      </div>
      <ul className="rows">
        {results.slice(0, limit).map((e) => {
          const isSel = selected?.has(e.id);
          return (
            <li key={e.id}>
              <button className={`row ${isSel ? "selected" : ""}`} onClick={() => (onToggle ? onToggle(e.id) : onOpen?.(e.id))}>
                <Thumb ex={e} />
                <span className="row-main">
                  <span className="row-title">{titleCase(e.name)}</span>
                  <span className="row-sub">
                    {titleCase(e.target)} · {e.equipment}
                    {!q && recentSet.has(e.id) && <span className="badge">recent</span>}
                  </span>
                </span>
                {onToggle && <span className={`check ${isSel ? "on" : ""}`}>{isSel ? "✓" : "+"}</span>}
              </button>
              {onToggle && (
                <button className="info-btn" aria-label="Details" onClick={() => onOpen?.(e.id)}>
                  i
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {limit < results.length && <div ref={sentinel} className="sentinel" />}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={value ? "active" : ""}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {titleCase(o)}
        </option>
      ))}
    </select>
  );
}
