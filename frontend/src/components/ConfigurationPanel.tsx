import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getFontOptionLabel, sortFontsForCakeTopper } from "../config/cakeTopperFontRecommendations";
import type { FontInfo } from "../types/design";

const PAGE_SIZE = 12;

interface ConfigurationPanelProps {
  fonts: FontInfo[];
  manualFonts: FontInfo[];
  onManualFontsChange: (fontIds: string[]) => Promise<void>;
  onDeleteFonts: (fontIds: string[]) => Promise<void>;
}

export function ConfigurationPanel({
  fonts,
  manualFonts,
  onManualFontsChange,
  onDeleteFonts,
}: ConfigurationPanelProps) {
  const [search, setSearch] = useState("");
  const [managementSearch, setManagementSearch] = useState("");
  const [selectedFontId, setSelectedFontId] = useState("");
  const [manualOpen, setManualOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manualIds = useMemo(() => manualFonts.map((font) => font.id), [manualFonts]);
  const sortedFonts = useMemo(() => sortFontsForCakeTopper(fonts), [fonts]);
  const availableFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedFonts
      .filter((font) => !manualIds.includes(font.id))
      .filter((font) => !q || `${font.full_name} ${font.family} ${font.style}`.toLowerCase().includes(q));
  }, [sortedFonts, manualIds, search]);
  const managedFonts = useMemo(() => {
    const q = managementSearch.trim().toLowerCase();
    return sortedFonts.filter(
      (font) => !q || `${font.full_name} ${font.family} ${font.style}`.toLowerCase().includes(q),
    );
  }, [sortedFonts, managementSearch]);
  const pageCount = Math.max(1, Math.ceil(managedFonts.length / PAGE_SIZE));
  const pageFonts = managedFonts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedValue = availableFonts.some((font) => font.id === selectedFontId)
    ? selectedFontId
    : availableFonts[0]?.id || "";
  const allPageSelected = pageFonts.length > 0 && pageFonts.every((font) => selectedIds.has(font.id));

  useEffect(() => setPage(1), [managementSearch]);
  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);
  useEffect(() => {
    const liveIds = new Set(fonts.map((font) => font.id));
    setSelectedIds((current) => new Set([...current].filter((id) => liveIds.has(id))));
  }, [fonts]);

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

  function toggleSelected(fontId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(fontId) ? next.delete(fontId) : next.add(fontId);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageFonts.forEach((font) => (allPageSelected ? next.delete(font.id) : next.add(font.id)));
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`Remove ${ids.length} selected font${ids.length === 1 ? "" : "s"} from the app?`)) return;
    setSaving(true);
    setError(null);
    try {
      await onDeleteFonts(ids);
      setSelectedIds(new Set());
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not delete fonts.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="config-panel">
      <header className="ct-app-header">
        <div className="ct-brand-lockup">
          <img className="ct-brand-logo" src="/brand/etch-n-shine-logo.png" alt="Etch N Shine" />
          <div><p>Etch N Shine</p><h1>Configuration</h1></div>
        </div>
        <div className="ct-header-actions"><div className="fa-header-stats"><span><strong>{fonts.length}</strong> fonts</span></div></div>
      </header>

      {error && <p className="error">{error}</p>}

      <details
        className="config-card config-accordion"
        open={manualOpen}
        onToggle={(event) => setManualOpen(event.currentTarget.open)}
      >
        <summary className="config-card-header">
          <div><h2>Manual Fonts</h2><p>Saved favourites that appear first in Designer font dropdowns.</p></div>
          <span className="config-save-state">{saving ? "Saving..." : `${manualFonts.length} selected`}</span>
        </summary>
        <div className="config-accordion-body">
          <div className="config-add-row">
            <label className="ct-field"><span>Find font</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fonts" aria-label="Search fonts for manual list" /></label>
            <label className="ct-field"><span>Font</span><select value={selectedValue} onChange={(event) => setSelectedFontId(event.target.value)} aria-label="Font to add to manual list" disabled={!availableFonts.length}>{!availableFonts.length ? <option value="">No fonts available</option> : availableFonts.map((font) => <option key={font.id} value={font.id}>{getFontOptionLabel(font)}</option>)}</select></label>
            <button type="button" className="config-add-button" disabled={!selectedValue || saving} onClick={() => save([...manualIds, selectedValue])}><Plus size={17} aria-hidden="true" /> Add</button>
          </div>
          {!manualFonts.length ? <p className="fonts-empty">No manual fonts selected yet.</p> : <div className="manual-font-list" aria-label="Selected manual fonts">{manualFonts.map((font) => <div key={font.id} className="manual-font-row"><span><strong>{font.full_name}</strong><small>{font.style}</small></span><button type="button" title={`Remove ${font.full_name}`} aria-label={`Remove ${font.full_name}`} disabled={saving} onClick={() => save(manualIds.filter((id) => id !== font.id))}><Trash2 size={16} aria-hidden="true" /></button></div>)}</div>}
        </div>
      </details>

      <details className="config-card config-accordion">
        <summary className="config-card-header">
          <div><h2>Font Management</h2><p>Choose one or more fonts to remove from the app.</p></div>
          <span className="config-save-state">{fonts.length} fonts</span>
        </summary>
        <div className="config-accordion-body">
          <div className="font-management-toolbar">
            <label className="ct-field"><span>Search library</span><input value={managementSearch} onChange={(event) => setManagementSearch(event.target.value)} placeholder="Search by name, family or style" /></label>
            <button type="button" className="font-delete-button" disabled={!selectedIds.size || saving} onClick={deleteSelected}><Trash2 size={17} aria-hidden="true" /> Delete selected ({selectedIds.size})</button>
          </div>
          <div className="font-management-select-all"><label><input type="checkbox" checked={allPageSelected} onChange={togglePage} disabled={!pageFonts.length || saving} /> Select this page</label><span>{managedFonts.length} matching fonts</span></div>
          {!pageFonts.length ? <p className="fonts-empty">No fonts match your search.</p> : <div className="font-management-list">{pageFonts.map((font) => <label key={font.id} className={selectedIds.has(font.id) ? "font-management-row font-management-row--selected" : "font-management-row"}><input type="checkbox" checked={selectedIds.has(font.id)} onChange={() => toggleSelected(font.id)} disabled={saving} /><span><strong>{font.full_name}</strong><small>{font.family} · {font.style}</small></span><em>{font.source === "system" ? "System" : "Project"}</em></label>)}</div>}
          <nav className="config-pagination" aria-label="Font management pages"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={16} /></button></nav>
        </div>
      </details>
    </div>
  );
}
