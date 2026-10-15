import { useEffect, useRef, type ReactNode } from "react";

let openSheets = 0;

export function Sheet({ title, onClose, children, actions }: { title?: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const depth = ++openSheets;
    // Only the top-most sheet reacts to Escape.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && depth === openSheets && close.current();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      if (--openSheets === 0) document.body.classList.remove("no-scroll");
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="link" onClick={onClose}>
            Close
          </button>
          {title && <h2>{title}</h2>}
          <div className="sheet-actions">{actions}</div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
