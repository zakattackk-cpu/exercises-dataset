import { useEffect, useState } from "react";

/**
 * Numeric input that keeps its own draft while focused, so async writes to IndexedDB
 * never fight the user's typing. Shows the previous session's value as a placeholder.
 */
export function NumInput({
  value,
  placeholder,
  decimal,
  onChange,
}: {
  value: number | undefined;
  placeholder?: number;
  decimal?: boolean;
  onChange: (v: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value == null ? "" : String(value));
  }, [value, focused]);

  return (
    <input
      className="num"
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={draft}
      placeholder={placeholder != null ? String(placeholder) : "–"}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (!/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        const n = parseFloat(raw);
        onChange(Number.isFinite(n) ? n : undefined);
      }}
    />
  );
}
