import { useEffect, useId, useState, type ReactNode, type Ref } from "react";
import { clamp } from "../utils/units";

export function NumberField({ label, value, min, max, step = .1, suffix = "mm", onChange, commit, slider = false }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string;
  onChange: (value: number) => void; commit?: () => void; slider?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(Number(value.toFixed(4))));
  useEffect(() => { setDraft(String(Number(value.toFixed(4)))); }, [value]);
  const numeric = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(numeric) && numeric >= min && numeric <= max;
  return <div className="kc-field">
    <label htmlFor={id}>{label}</label>
    <div className="kc-number"><input id={id} type="number" value={draft} min={min} max={max} step={step} aria-invalid={!valid}
      onChange={event => { const text = event.target.value; setDraft(text); const number = Number(text); if (text && Number.isFinite(number) && number >= min && number <= max) onChange(number); }}
      onBlur={() => {
        // Only commit a draft the user actually changed. The draft shows a
        // rounded unit conversion; re-committing it would alter physical mm.
        const shown = String(Number(value.toFixed(4)));
        if (draft.trim() === shown) { commit?.(); return; }
        const next = clamp(draft.trim() && Number.isFinite(numeric) ? numeric : value, min, max);
        setDraft(String(Number(next.toFixed(4)))); if (next !== value) onChange(next); commit?.();
      }} />
      {suffix && <span>{suffix}</span>}
    </div>
    {slider && <input type="range" min={min} max={max} step={step} value={value} aria-label={`${label} slider`}
      onChange={event => onChange(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} />}
  </div>;
}
export function Toggle({ label, checked, onChange, inputRef }: { label: string; checked: boolean; onChange: (checked: boolean) => void; inputRef?: Ref<HTMLInputElement> }) {
  return <label className="kc-toggle"><input ref={inputRef} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}
export function Section({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return <details className="kc-section" open={open || undefined}><summary>{title}</summary><div className="kc-section-content">{children}</div></details>;
}
