import type { FontInfo } from "../types/design";

interface FontSelectorProps {
  fonts: FontInfo[];
  value: string;
  onChange: (value: string) => void;
}

export function FontSelector({ fonts, value, onChange }: FontSelectorProps) {
  return (
    <label className="field">
      <span>Font</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Font selection">
        {fonts.map((font) => (
          <option key={font.id} value={font.id}>
            {font.full_name} ({font.style})
          </option>
        ))}
      </select>
    </label>
  );
}
