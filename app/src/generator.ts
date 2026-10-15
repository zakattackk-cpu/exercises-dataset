import type { Exercise } from "./exercises";
import type { RoutineItem } from "./db";

// Well-known movements, so generated workouts lean toward standard gym lifts
// rather than the dataset's many niche variations.
const COMPOUND = new Set(
  "0025 0047 0314 0289 0043 0042 0032 0085 1459 0652 1326 0027 0293 0861 1350 0198 0426 0405 0091 0739 0336 1460 1760 0410 1409 0251 0814 0662 0576 0044 0117 0064".split(" "),
);
const ISOLATION = new Set(
  "0294 0031 0313 0447 0334 0241 0061 0599 0585 0605 0594 0227 0308 0596 0095 0406 0202 0076 0472 0274 0175 2135 2963 0276 0277 0620 0872 0687 0243 0796".split(" "),
);
// Sport drills and novelty moves that rank well on short names but don't belong in a gym session.
const EXCLUDED = /boxing|\bhook\b|\bjab\b|spell caster|^flag$|landmine 180|handstand/;
const ODD = /^l-|muscle up|kick out|korean|hug knees|frog|archer|clock|sissy|plyo|v\. \d|\((male|female)\)|pov|bosu|stability|with |on /;

const EQUIPMENT_SCORE: Record<string, number> = {
  barbell: 20,
  dumbbell: 20,
  cable: 16,
  "leverage machine": 14,
  "body weight": 12,
  "ez barbell": 10,
  "sled machine": 10,
  "smith machine": 8,
  weighted: 6,
  kettlebell: 6,
};

type Kind = "compound" | "isolation";
interface Slot {
  targets: string[];
  kind: Kind;
  /** Preferred staple ids for this slot (e.g. a squat pattern). */
  prefer?: string[];
}

const S = (targets: string, kind: Kind, prefer?: string): Slot => ({
  targets: targets.split(","),
  kind,
  prefer: prefer?.split(" "),
});

export const FOCUSES: Record<string, { label: string; slots: Slot[] }> = {
  full: {
    label: "Full body",
    slots: [
      S("glutes,quads", "compound", "0043 0042 1760 0739"),
      S("pectorals", "compound", "0025 0289 0314 0047 0576"),
      S("upper back,lats", "compound", "0027 0293 0861 1350 0652 0198"),
      S("hamstrings,glutes", "compound", "0085 1459 0032"),
      S("delts", "compound", "0426 0405 0091"),
      S("abs", "isolation"),
      S("biceps", "isolation"),
      S("triceps", "isolation"),
    ],
  },
  push: {
    label: "Push",
    slots: [
      S("pectorals", "compound", "0025 0289 0576"),
      S("delts", "compound", "0426 0405 0091"),
      S("pectorals", "compound", "0047 0314 0251"),
      S("delts", "isolation", "0334"),
      S("triceps", "isolation", "0241 0061"),
      S("pectorals", "isolation", "0227 0308 0596"),
      S("triceps", "isolation"),
      S("delts", "isolation"),
    ],
  },
  pull: {
    label: "Pull",
    slots: [
      S("lats", "compound", "0652 1326 0198"),
      S("upper back", "compound", "0027 0293 0861 1350"),
      S("lats", "compound", "0198 0064"),
      S("delts", "isolation", "0202 0076"),
      S("biceps", "isolation", "0294 0031 0447"),
      S("traps", "isolation", "0095 0406"),
      S("biceps", "isolation", "0313"),
      S("upper back", "compound"),
    ],
  },
  legs: {
    label: "Legs",
    slots: [
      S("glutes,quads", "compound", "0043 0042"),
      S("hamstrings,glutes", "compound", "0085 0032 1459"),
      S("quads,glutes", "compound", "0739 0336 0410 1760"),
      S("hamstrings", "isolation", "0599"),
      S("quads", "isolation", "0585"),
      S("calves", "isolation", "0605 0594"),
      S("glutes", "compound", "1409"),
      S("abs", "isolation"),
    ],
  },
  upper: {
    label: "Upper",
    slots: [
      S("pectorals", "compound", "0025 0289 0047"),
      S("upper back,lats", "compound", "0027 0293 0861 0652"),
      S("delts", "compound", "0426 0405"),
      S("lats", "compound", "0198 0652 1326"),
      S("biceps", "isolation"),
      S("triceps", "isolation"),
      S("delts", "isolation", "0334"),
      S("pectorals", "isolation"),
    ],
  },
  lower: {
    label: "Lower",
    slots: [
      S("glutes,quads", "compound", "0043 0042 0739"),
      S("hamstrings,glutes", "compound", "0085 0032"),
      S("quads,glutes", "compound", "0336 0410 1760"),
      S("hamstrings", "isolation", "0599"),
      S("calves", "isolation"),
      S("abs", "isolation", "0472 0175"),
      S("quads", "isolation", "0585"),
      S("abs", "isolation"),
    ],
  },
  core: {
    label: "Core",
    slots: [
      S("abs", "isolation", "0472 2963"),
      S("abs", "isolation", "0175 0243"),
      S("abs", "isolation", "0796 0276"),
      S("abs", "isolation", "0274 0277 0872"),
      S("abs", "isolation", "0687 0620"),
      S("abs", "isolation"),
    ],
  },
};

export const ALL_TARGETS = [
  "pectorals", "delts", "triceps", "lats", "upper back", "traps", "biceps", "forearms",
  "quads", "glutes", "hamstrings", "calves", "adductors", "abductors", "abs",
];

export const DURATIONS: Record<number, number> = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

export interface GenOptions {
  focus: string; // key of FOCUSES or "custom"
  customTargets: string[];
  minutes: number;
  equipment: Set<string>; // allowed equipment
}

function score(e: Exercise, slot: Slot): number {
  let s = EQUIPMENT_SCORE[e.equipment] ?? 0;
  if (slot.prefer?.includes(e.id)) s += 120;
  if (slot.kind === "compound" && COMPOUND.has(e.id)) s += 60;
  if (slot.kind === "isolation" && ISOLATION.has(e.id)) s += 60;
  if (slot.kind === "compound" && ISOLATION.has(e.id)) s -= 60;
  if (slot.kind === "isolation" && COMPOUND.has(e.id)) s -= 60;
  if (COMPOUND.has(e.id) || ISOLATION.has(e.id)) s += 20;
  s -= e.name.length * 0.6; // long names tend to be niche variants
  if (ODD.test(e.name)) s -= 40;
  return s;
}

function slotsFor(opts: GenOptions): Slot[] {
  if (opts.focus !== "custom") return FOCUSES[opts.focus].slots;
  const ts = opts.customTargets.length ? opts.customTargets : ["pectorals"];
  // First pass compound per muscle, then isolation, repeating as needed.
  const slots: Slot[] = [];
  for (let i = 0; slots.length < 8; i++) {
    const t = ts[i % ts.length];
    slots.push(S(t, i < ts.length && t !== "abs" && t !== "calves" && t !== "forearms" ? "compound" : "isolation"));
  }
  return slots;
}

export function pickForSlot(all: Exercise[], slot: Slot, opts: GenOptions, exclude: Set<string>): Exercise | null {
  const candidates = all
    .filter(
      (e) => slot.targets.includes(e.target) && opts.equipment.has(e.equipment) && e.log !== "time" && !exclude.has(e.id) && !EXCLUDED.test(e.name),
    )
    .map((e) => ({ e, s: score(e, slot) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5);
  if (!candidates.length) return null;
  // Weighted random over the top few, biased toward the best match.
  const weights = candidates.map((_, i) => 1 / (i + 1) ** 2);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].e;
  }
  return candidates[0].e;
}

export interface GeneratedItem extends RoutineItem {
  slot: Slot;
}

export function generateWorkout(all: Exercise[], opts: GenOptions): GeneratedItem[] {
  const n = DURATIONS[opts.minutes] ?? 6;
  const used = new Set<string>();
  const out: GeneratedItem[] = [];
  for (const slot of slotsFor(opts)) {
    if (out.length >= n) break;
    const e = pickForSlot(all, slot, opts, used);
    if (!e) continue;
    used.add(e.id);
    out.push({ exerciseId: e.id, slot, ...prescription(slot, e, out.length) });
  }
  return out;
}

function prescription(slot: Slot, e: Exercise, index: number): { sets: number; reps: string } {
  if (slot.kind === "compound" && index === 0 && e.log === "weight") return { sets: 4, reps: "5-8" };
  if (slot.kind === "compound") return { sets: 3, reps: "8-12" };
  if (e.target === "abs") return { sets: 3, reps: "12-20" };
  return { sets: 3, reps: "10-15" };
}

export function rerollItem(all: Exercise[], items: GeneratedItem[], index: number, opts: GenOptions): GeneratedItem[] {
  const exclude = new Set(items.map((i) => i.exerciseId));
  const e = pickForSlot(all, items[index].slot, opts, exclude);
  if (!e) return items;
  return items.map((it, i) => (i === index ? { ...it, exerciseId: e.id } : it));
}
