import { useEffect } from "react";
import { rest, useRest } from "../rest";
import { formatDuration } from "../stats";

export function RestBar() {
  const { remaining, total } = useRest();
  const over = remaining != null && remaining <= 0;

  // Clear the "rest over" banner automatically after a minute.
  useEffect(() => {
    if (remaining != null && remaining < -60) rest.stop();
  }, [remaining]);

  if (remaining == null) return null;
  return (
    <div className={`restbar ${over ? "over" : ""}`} role="timer" aria-live="polite">
      <span className="rest-progress" style={{ width: over ? "100%" : `${100 - (remaining / total) * 100}%` }} />
      <span className="rest-label">{over ? "Rest over — next set!" : `Rest ${formatDuration(remaining)}`}</span>
      {!over && (
        <>
          <button onClick={() => rest.add(-15)}>−15</button>
          <button onClick={() => rest.add(15)}>+15</button>
        </>
      )}
      <button onClick={() => rest.stop()}>{over ? "OK" : "Skip"}</button>
    </div>
  );
}
