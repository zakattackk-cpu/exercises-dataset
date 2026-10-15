import { useEffect, useState } from "react";

export type LogType = "weight" | "reps" | "time";

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondary: string[];
  steps: string[];
  image: string;
  gif: string;
  log: LogType;
}

let cache: Promise<Exercise[]> | null = null;
let byId = new Map<string, Exercise>();

export function loadExercises(): Promise<Exercise[]> {
  cache ??= fetch("exercises.json")
    .then((r) => r.json() as Promise<Exercise[]>)
    .then((list) => {
      byId = new Map(list.map((e) => [e.id, e]));
      return list;
    });
  return cache;
}

/** Synchronous lookup; valid once loadExercises() has resolved (App gates rendering on it). */
export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export function useExercises(): Exercise[] | null {
  const [list, setList] = useState<Exercise[] | null>(null);
  useEffect(() => {
    loadExercises().then(setList);
  }, []);
  return list;
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
