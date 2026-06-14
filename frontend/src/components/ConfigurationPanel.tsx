import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { getFontOptionLabel, sortFontsForCakeTopper } from "../config/cakeTopperFontRecommendations";
import type { FontInfo } from "../types/design";

interface ConfigurationPanelProps {
  fonts: FontInfo[];
  manualFonts: FontInfo[];
  onManualFontsChange: (fontIds: string[]) => Promise<void>;
}

export function ConfigurationPanel({
  fonts,
  manualFonts,
  onManualFontsChange,
}: ConfigurationPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedFontId, setSelectedFontId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manualIds = useMemo(() => manualFonts.map((font) => font.id), [manualFonts]);
  const availableFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortFontsForCakeTopper(fonts)
      .filter((font) => !manualIds.includes(font.id))
      .filter((font) => {
        if (!q) return true;
        return `${font.full_name} ${font.family} ${font.style}`.toLowerCase().includes(q);
      });
  }, [fonts, manualIds, search]);

  const selectedValue = availableFonts.some((font) => font.id === selectedFontId)
    ? selectedFontId
    : availableFonts[0]?.id || "";

  async function save(nextIds: string[]) {
    setSaving(true);
    setError(null);
    try {
      await onManualFontsChange(nextIds);
      setSelectedFontId("");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not save manual fonts.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="config-panel">
      <header className="ct-app-header">
        <div className="ct-brand-lockup">
          <img className="ct-brand-logo" src="/brand/etch-n-shine-logo.png" alt="Etch N Shine" />
          <div>
            <p>Etch N Shine</p>
            <h1>Configuration</h1>
          </div>
        </div>
        <div className="ct-header-actions">
          <div className="fa-header-stats">
            <span>
              <strong>{manualFonts.length}</strong>
              manual fonts
            </span>
          </div>
        </div>
      </header>

      <section className="config-card">
        <div className="config-card-header">
          <div>
            <h2>Manual Fonts</h2>
            <p>
              These fonts are saved to the project and appear first in Designer font dropdowns.
            </p>
          </div>
          <span className="config-save-state">{saving ? "Saving..." : "Saved"}</span>
        </div>

        <div className="config-add-row">
          <label className="ct-field">
            <span>Find font</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fonts"
              aria-label="Search fonts for manual list"
            />
          </label>
          <label className="ct-field">
            <span>Font</span>
            <select
              value={selectedValue}
              onChange={(event) => setSelectedFontId(event.target.value)}
              aria-label="Font to add to manual list"
              disabled={availableFonts.length === 0}
            >
              {availableFonts.length === 0 ? (
                <option value="">No fonts available</option>
              ) : (
                availableFonts.map((font) => (
                  <option key={font.id} value={font.id}>
                    {getFontOptionLabel(font)}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            className="config-add-button"
            disabled={!selectedValue || saving}
            onClick={() => save([...manualIds, selectedValue])}
          >
            <Plus size={17} aria-hidden="true" />
            Add
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {manualFonts.length === 0 ? (
          <p className="fonts-empty">No manual fonts selected yet.</p>
        ) : (
          <div className="manual-font-list" aria-label="Selected manual fonts">
            {manualFonts.map((font) => (
              <div key={font.id} className="manual-font-row">
                <span>
                  <strong>{font.full_name}</strong>
                  <small>{font.style}</small>
                </span>
                <button
                  type="button"
                  title={`Remove ${font.full_name}`}
                  aria-label={`Remove ${font.full_name}`}
                  disabled={saving}
                  onClick={() => save(manualIds.filter((id) => id !== font.id))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
