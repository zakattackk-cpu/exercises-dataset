import { useRef, useState } from "react";
import { db, exportAll, importAll, type Settings } from "../db";
import { useApp } from "../context";

export function SettingsSheet() {
  const { settings } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const save = (patch: Partial<Settings>) => db.settings.put({ ...settings, ...patch });

  async function doExport() {
    const blob = new Blob([await exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Backup downloaded.");
  }

  const [pending, setPending] = useState<File | null>(null);

  async function doImport(file: File) {
    setPending(null);
    try {
      const r = await importAll(await file.text());
      setMsg(`Restored ${r.workouts} workouts and ${r.routines} routines.`);
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="stack">
      <div className="setting">
        <span>Weight unit</span>
        <div className="segmented small">
          {(["kg", "lb"] as const).map((u) => (
            <button key={u} className={settings.unit === u ? "on" : ""} onClick={() => save({ unit: u })}>
              {u}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">Past workouts keep the unit they were logged in and are converted for charts and records.</p>

      <div className="setting">
        <span>Rest timer</span>
        <div className="segmented small">
          {[60, 90, 120, 180].map((s) => (
            <button key={s} className={settings.restSeconds === s ? "on" : ""} onClick={() => save({ restSeconds: s })}>
              {s < 120 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </div>
      </div>

      <h3>Your data</h3>
      <p className="muted small">
        Everything is stored only on this device. Export a backup regularly — clearing browser data or uninstalling the app deletes it.
      </p>
      <div className="btn-row">
        <button className="btn" onClick={doExport}>
          Export backup
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Restore backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) setPending(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      {pending ? (
        <div className="card">
          <p className="small">
            Replace <strong>all</strong> current workouts, routines and settings with “{pending.name}”?
          </p>
          <div className="btn-row">
            <button className="btn danger small" onClick={() => doImport(pending)}>
              Replace my data
            </button>
            <button className="btn small" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="muted small">Restoring replaces all current data with the backup.</p>
      )}
      {msg && <p className="card small">{msg}</p>}

      <p className="attribution">Exercise data from exercises-dataset (MIT). Exercise media © Gym visual — gymvisual.com.</p>
    </div>
  );
}
