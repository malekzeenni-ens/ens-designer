import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchFontCharacters } from "../services/generationApi";
import type { CharacterInfo } from "../types/design";

interface GlyphBrowserDrawerProps {
  lineIndex: number;
  lineName: string;
  fontId: string;
  fontName: string;
  currentLineText: string;
  onApply: (lineIndex: number, newText: string) => void;
  onClose: () => void;
}

const CATEGORY_ORDER = [
  "uppercase",
  "lowercase",
  "digits",
  "punctuation",
  "ligature",
  "alternate",
  "ornament",
  "special",
  "other_letter",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  uppercase: "Uppercase",
  lowercase: "Lowercase",
  digits: "Digits",
  punctuation: "Punctuation",
  ligature: "Ligatures",
  alternate: "Alternates",
  ornament: "Ornaments",
  special: "Special",
  other_letter: "Other Letters",
  other: "Other",
};

export function GlyphBrowserDrawer({
  lineIndex,
  lineName,
  fontId,
  fontName,
  currentLineText,
  onApply,
  onClose,
}: GlyphBrowserDrawerProps) {
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [charsError, setCharsError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [composedText, setComposedText] = useState(currentLineText);

  const fontFamily = `glyph-preview-${fontId}`;

  // Load font file into browser so PUA glyphs render correctly
  useEffect(() => {
    setFontLoaded(false);
    const fontFace = new FontFace(fontFamily, `url(/api/fonts/${fontId}/file)`);
    document.fonts.add(fontFace);
    fontFace.load().then(() => setFontLoaded(true)).catch(() => {
      // Font file failed to load — glyphs will show with system fallback
    });
  }, [fontId, fontFamily]);

  // Fetch character list from backend
  useEffect(() => {
    setLoadingChars(true);
    setCharsError(null);
    fetchFontCharacters(fontId)
      .then((data) => {
        setCharacters(data.characters);
        setLoadingChars(false);
      })
      .catch((e: Error) => {
        setCharsError(e.message);
        setLoadingChars(false);
      });
  }, [fontId]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const availableCategories = useMemo(() => {
    const present = new Set(characters.map((c) => c.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [characters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter((c) => {
      const matchesCat = category === "all" || c.category === category;
      const matchesSearch =
        !q ||
        c.label.toLowerCase().includes(q) ||
        c.glyph_name.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [characters, category, search]);

  function appendChar(char: string) {
    setComposedText((prev) => prev + char);
  }

  function handleApply() {
    if (composedText !== currentLineText) {
      onApply(lineIndex, composedText);
    }
    onClose();
  }

  const previewStyle = fontLoaded
    ? { fontFamily: `"${fontFamily}", serif` }
    : undefined;

  return createPortal(
    <div className="ct-glyph-overlay">
      <div
        className="ct-glyph-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="ct-glyph-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Glyph Browser"
      >
        {/* ── Header ── */}
        <header className="ct-glyph-header">
          <div className="ct-glyph-header-info">
            <h2>Glyph Browser</h2>
            <p>
              {fontName} · Line {lineIndex + 1}: <strong>{lineName}</strong>
            </p>
          </div>
          <button
            type="button"
            className="ct-glyph-close"
            onClick={onClose}
            aria-label="Close glyph browser"
          >
            ×
          </button>
        </header>

        {/* ── Compose bar ── */}
        <div className="ct-glyph-compose">
          <label htmlFor="ct-glyph-text" className="ct-glyph-compose-label-row">
            <span className="ct-glyph-compose-label">Line text</span>
            <span className="ct-glyph-compose-hint">Click a glyph to append it</span>
          </label>
          <input
            id="ct-glyph-text"
            type="text"
            className="ct-glyph-compose-input"
            value={composedText}
            onChange={(e) => setComposedText(e.target.value)}
            style={previewStyle}
            spellCheck={false}
            placeholder="Click glyphs below to build text…"
          />
          <div className="ct-glyph-compose-actions">
            <button
              type="button"
              className="ct-glyph-reset-btn"
              onClick={() => setComposedText(currentLineText)}
              disabled={composedText === currentLineText}
              title="Revert to original text"
            >
              Reset
            </button>
            <button
              type="button"
              className="ct-primary-action"
              onClick={handleApply}
              disabled={composedText === currentLineText}
            >
              Apply to Line {lineIndex + 1}
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="ct-glyph-filters">
          <input
            type="text"
            className="ct-glyph-search"
            placeholder="Search glyphs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ct-glyph-cat-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={category === "all"}
              className={`ct-glyph-cat-btn${category === "all" ? " ct-glyph-cat-btn--active" : ""}`}
              onClick={() => setCategory("all")}
            >
              All <span className="ct-glyph-count">{characters.length}</span>
            </button>
            {availableCategories.map((cat) => {
              const count = characters.filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={category === cat}
                  className={`ct-glyph-cat-btn${category === cat ? " ct-glyph-cat-btn--active" : ""}`}
                  onClick={() => setCategory(cat)}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                  <span className="ct-glyph-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Glyph grid ── */}
        <div className="ct-glyph-grid-wrap">
          {loadingChars && (
            <p className="ct-muted ct-glyph-status">Loading characters…</p>
          )}
          {charsError && (
            <p className="ct-glyph-status ct-glyph-status--error">{charsError}</p>
          )}
          {!loadingChars && !charsError && filtered.length === 0 && (
            <p className="ct-muted ct-glyph-status">No characters match this filter.</p>
          )}
          {!loadingChars && !charsError && filtered.length > 0 && (
            <div className="ct-glyph-grid">
              {filtered.map((c) => (
                <button
                  key={c.codepoint}
                  type="button"
                  className="ct-glyph-cell"
                  title={`${c.glyph_name}  ·  U+${c.codepoint.toString(16).toUpperCase().padStart(4, "0")}`}
                  onClick={() => appendChar(c.char)}
                >
                  <span className="ct-glyph-char" style={previewStyle}>
                    {c.char}
                  </span>
                  <span className="ct-glyph-name">{c.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="ct-glyph-footer">
          <span className="ct-muted">
            {!loadingChars && `${filtered.length} of ${characters.length} characters`}
            {!fontLoaded && !loadingChars && " · Loading font preview…"}
          </span>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
