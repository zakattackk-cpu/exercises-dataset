import { createContext, useContext } from "react";
import type { Settings } from "./db";

export type Tab = "workout" | "routines" | "library" | "progress";

export interface AppCtx {
  settings: Settings;
  setTab: (t: Tab) => void;
  showExercise: (id: string) => void;
}

export const Ctx = createContext<AppCtx>(null!);
export const useApp = () => useContext(Ctx);
