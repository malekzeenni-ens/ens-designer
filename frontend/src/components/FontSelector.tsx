import type { FontInfo } from "../types/design";

interface FontSelectorProps {
  fonts: FontInfo[];
  value: string;
  onChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function FontSelector({ fonts, value, onChange, search, onSearchChange }: FontSelectorProps) {
  return (
    <div className="font-field">
      <label className="field">
        <span>Font search</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search fonts"
          aria-label="Search fonts"
        />
      </label>
      <label className="field">
        <span>Font</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Font selection">
          {fonts.length === 0 ? (
            <option value="">No fonts found</option>
          ) : (
            fonts.map((font) => (
              <option key={font.id} value={font.id}>
                {font.full_name} ({font.style})
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
}
