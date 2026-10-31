import { Moon, Sun } from "lucide-react";
import type { KeyboardEvent } from "react";

import type { Appearance } from "../appearance";

interface AppearanceSwitchProps {
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
}

/** One shared controlled value for the header and Settings. */
export function AppearanceSwitch({ appearance, onChange }: AppearanceSwitchProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "dark" : event.key === "End" ? "bright" : appearance === "dark" ? "bright" : "dark";
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-appearance="${next}"]`)?.focus();
  }

  return (
    <div className="appearance-switch" role="radiogroup" aria-label="Appearance" onKeyDown={onKeyDown}>
      <button type="button" role="radio" aria-checked={appearance === "dark"} aria-label="Dark theme"
        data-appearance="dark" tabIndex={appearance === "dark" ? 0 : -1} onClick={() => onChange("dark")} title="Dark theme">
        <Moon size={17} aria-hidden="true" /><span>Dark</span>
      </button>
      <button type="button" role="radio" aria-checked={appearance === "bright"} aria-label="Bright theme"
        data-appearance="bright" tabIndex={appearance === "bright" ? 0 : -1} onClick={() => onChange("bright")} title="Bright theme">
        <Sun size={17} aria-hidden="true" /><span>Bright</span>
      </button>
    </div>
  );
}
