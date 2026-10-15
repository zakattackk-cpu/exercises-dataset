// Builds public/exercises.json (slim, English-only) from ../data/exercises.json
// and mirrors ../images and ../videos into public/media/. Safe to re-run.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = join(appDir, "..");
const publicDir = join(appDir, "public");

// Fix a few mojibake sequences present in the source names.
const clean = (s) => s.replace(/в°/g, "°").trim();

// Movements logged as duration rather than weight x reps.
function logType(e) {
  if (e.category === "cardio") return "time";
  if (/\b(stretch|pose|sequence)\b/.test(e.name)) return "time";
  if (/\bplank\b/.test(e.name) && !/tap|push-up|fly|adduction|lift|twist/.test(e.name)) return "time";
  if (e.equipment === "body weight" || e.equipment === "assisted") return "reps";
  return "weight";
}

const src = JSON.parse(readFileSync(join(repoDir, "data", "exercises.json"), "utf8"));
const slim = src.map((e) => ({
  id: e.id,
  name: clean(e.name),
  bodyPart: e.category,
  equipment: e.equipment,
  target: e.target,
  secondary: e.secondary_muscles,
  steps: e.instruction_steps.en,
  image: "media/" + e.image,
  gif: "media/" + e.gif_url,
  log: logType(e),
}));

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "exercises.json"), JSON.stringify(slim));
console.log(`exercises.json: ${slim.length} exercises`);

for (const folder of ["images", "videos"]) {
  const from = join(repoDir, folder);
  const to = join(publicDir, "media", folder);
  mkdirSync(to, { recursive: true });
  let copied = 0;
  for (const f of readdirSync(from)) {
    const dest = join(to, f);
    if (existsSync(dest) && statSync(dest).size === statSync(join(from, f)).size) continue;
    copyFileSync(join(from, f), dest);
    copied++;
  }
  console.log(`media/${folder}: ${copied} copied`);
}
