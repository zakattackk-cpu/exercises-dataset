import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "./db";
import { Ctx, type Tab } from "./context";
import { useExercises } from "./exercises";
import { ExerciseDetail } from "./components/ExerciseDetail";
import { Sheet } from "./components/Sheet";
import { RestBar } from "./components/RestBar";
import { WorkoutTab } from "./screens/WorkoutTab";
import { RoutinesTab } from "./screens/RoutinesTab";
import { LibraryTab } from "./screens/LibraryTab";
import { ProgressTab } from "./screens/ProgressTab";
import { SettingsSheet } from "./screens/SettingsSheet";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "workout", label: "Workout", icon: <path d="M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" /> },
  { id: "routines", label: "Routines", icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /> },
  { id: "library", label: "Exercises", icon: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5" /> },
  { id: "progress", label: "Progress", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
];

export default function App() {
  const exercises = useExercises();
  const settings = useLiveQuery(() => db.settings.get("me"), []) ?? DEFAULT_SETTINGS;
  const [tab, setTab] = useState<Tab>("workout");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  if (!exercises) return <div className="splash">Loading exercises…</div>;

  return (
    <Ctx.Provider value={{ settings, setTab, showExercise: setDetailId }}>
      <header className="topbar">
        <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
        <button className="icon-btn" aria-label="Settings" onClick={() => setShowSettings(true)}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
          </svg>
        </button>
      </header>

      <main className="content">
        {tab === "workout" && <WorkoutTab />}
        {tab === "routines" && <RoutinesTab />}
        {tab === "library" && <LibraryTab />}
        {tab === "progress" && <ProgressTab />}
      </main>

      <RestBar />
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? "active" : ""} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {detailId && (
        <Sheet onClose={() => setDetailId(null)}>
          <ExerciseDetail id={detailId} />
        </Sheet>
      )}
      {showSettings && (
        <Sheet onClose={() => setShowSettings(false)} title="Settings">
          <SettingsSheet />
        </Sheet>
      )}
    </Ctx.Provider>
  );
}
