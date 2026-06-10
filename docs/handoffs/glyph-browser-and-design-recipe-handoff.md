# Glyph Browser Drawer + SVG Design Recipe — Handoff

**Date:** 2026-06-09 to 2026-06-10
**Project:** EnS Designer — local web app (FastAPI backend + React/TypeScript/Vite frontend)
**Branch:** `main`
**Status:** Implemented, fixed, and pushed. Pending final user re-test after browser hard refresh.

**Commits:**
| Commit | Time (GMT+1) | Summary |
|---|---|---|
| `5c69795` | 2026-06-09 21:08 | feat: glyph browser drawer for special characters and PUA ligatures |
| `8c28704` | 2026-06-09 23:50 | fix: glyph browser shows as centred modal popup, larger compose input |
| `6b924d7` | 2026-06-10 00:54 | fix: render glyph browser via portal, add on-screen design recipe table |

---

## 1. Feature 1 — Glyph Browser Drawer

### 1.1 What it is

Some fonts used in the Cake Topper Designer (e.g. **Ayshana Script**) store extra glyphs — ligatures, swashes, alternates, ornaments — in the font's **Private Use Area (PUA, U+E000–U+F8FF)**. These are visible in Windows Character Map but were previously inaccessible in the app: the user could see a font "looked fancy" but had no way to insert those special characters into a line.

The Glyph Browser is a popup that:
- Shows every character in the selected font's `cmap`, rendered in the actual font (including PUA glyphs).
- Groups characters into categories (Uppercase, Lowercase, Digits, Punctuation, Ligatures, Alternates, Ornaments, Special, etc.) with per-category counts.
- Lets the user search by glyph name.
- Has a "Line text" compose box, pre-filled with the current line's text.
- Clicking a glyph appends it to the compose box.
- "Apply to Line N" replaces that line's text in the live design and re-renders immediately, without losing the rest of the canvas.

### 1.2 Entry point

Each line card in the **Lines** accordion (`CakeTopperPanel.tsx`) has a **Browse** button next to the font dropdown:

```tsx
<div className="ct-card-field">
  <span>Line font</span>
  <div className="ct-font-select-row">
    <select value={ls.fontId || defaultFontId} onChange={...}>
      {renderFontGroups(allFontGroups)}
    </select>
    <button type="button" className="ct-browse-btn" onClick={() => setGlyphBrowserLineIndex(li)}>
      Browse
    </button>
  </div>
</div>
```

`glyphBrowserLineIndex: number | null` state controls which line's drawer is open. `null` = closed.

### 1.3 Backend — new endpoints (`backend/app/api/routes/fonts.py`)

| Endpoint | Purpose |
|---|---|
| `GET /api/fonts/{font_id}/file` | Streams the raw font binary (TTF/OTF) via `FileResponse`, so the browser can load it with the Web FontFace API. |
| `GET /api/fonts/{font_id}/characters` | Returns every codepoint in the font's `cmap` (control characters excluded), categorised. |

Response shape (`FontCharacterMap`):
```json
{
  "font_id": "...",
  "font_name": "Ayshana Script",
  "characters": [
    { "codepoint": 57360, "char": "", "glyph_name": "aa", "category": "ligature", "label": "aa" },
    { "codepoint": 65, "char": "A", "glyph_name": "A", "category": "uppercase", "label": "A" }
  ]
}
```

Categorisation logic (`_categorise_codepoint`):
- **Standard Unicode** (codepoint < 0xE000 or > 0xF8FF): bucketed into `uppercase`, `lowercase`, `digits`, `punctuation`, `ligature`, `ornament`, `other_letter`, `other` based on the codepoint's Unicode category and known ligature ranges.
- **PUA codepoints** (0xE000–0xF8FF): no Unicode meaning, so categorisation is inferred from the **glyph name**:
  - Two-letter names (`aa`, `ar`, `ct`, etc.) → `ligature`
  - Names containing `orn`, `heart`, `flower`, etc. → `ornament`
  - Names containing `swsh`, `alt`, `ss0`–`ss3` → `alternate`
  - Everything else → `special`

Label logic (`_glyph_label`): for PUA glyphs the label is the glyph name (minus any `.suffix`, e.g. `heart.orn` → `heart`); for standard Unicode it's the character itself.

### 1.4 Frontend — new component (`frontend/src/components/GlyphBrowserDrawer.tsx`)

Props:
```ts
interface GlyphBrowserDrawerProps {
  lineIndex: number;
  lineName: string;
  fontId: string;
  fontName: string;
  currentLineText: string;
  onApply: (lineIndex: number, newText: string) => void;
  onClose: () => void;
}
```

Key behaviours:
- **Font preview loading**: on mount, creates `new FontFace('glyph-preview-{fontId}', 'url(/api/fonts/{fontId}/file)')`, calls `document.fonts.add(...)`, then `fontFace.load()`. Once loaded, `fontLoaded = true` and all glyph cells + the compose input get `fontFamily: '"glyph-preview-{fontId}", serif'` so PUA glyphs render correctly instead of as empty boxes.
- **Character list**: fetched via `fetchFontCharacters(fontId)` from `generationApi.ts`.
- **Filtering**: `category` (tab) + `search` (text) state, derived `filtered` list via `useMemo`.
- **Compose**: `composedText` state, initialised to `currentLineText`. `appendChar(char)` appends. "Reset" reverts to `currentLineText`. "Apply to Line N" calls `onApply(lineIndex, composedText)` then `onClose()`.
- **Escape key** closes the drawer (`window.addEventListener('keydown', ...)`).

### 1.5 Frontend — wiring in `CakeTopperPanel.tsx`

- New state: `glyphBrowserLineIndex`.
- `applyGlyphBrowserText(lineIndex, newLineText)`:
  ```ts
  function applyGlyphBrowserText(lineIndex: number, newLineText: string) {
    const currentWords = text.trim().split(/\s+/).filter(Boolean);
    if (lineIndex >= currentWords.length) return;
    currentWords[lineIndex] = newLineText;
    const newFullText = currentWords.join(" ");
    setText(newFullText);
    callApi(lineStates, interLineGaps, stakeCount, stakeOffsets, undefined, true, newFullText);
  }
  ```
  This needed a new `textOverride?: string` parameter on `callApi` (see §3 below) because `setText(newFullText)` and `callApi(...)` fire in the same tick — without the override, `callApi` would read the **stale** `text` from its closure.

- The drawer is rendered conditionally at the bottom of the component:
  ```tsx
  {glyphBrowserLineIndex !== null && (
    <GlyphBrowserDrawer
      lineIndex={glyphBrowserLineIndex}
      lineName={words[glyphBrowserLineIndex] ?? ""}
      fontId={lineStates[glyphBrowserLineIndex]?.fontId || defaultFontId}
      fontName={fonts.find(f => f.id === (lineStates[glyphBrowserLineIndex]?.fontId || defaultFontId))?.full_name ?? ""}
      currentLineText={words[glyphBrowserLineIndex] ?? ""}
      onApply={applyGlyphBrowserText}
      onClose={() => setGlyphBrowserLineIndex(null)}
    />
  )}
  ```

### 1.6 Bug 1 — Drawer rendered off-screen / below the fold

**Symptom (reported by user with screenshots):** Clicking **Browse** dimmed the whole page (backdrop fade worked), but the actual drawer panel with the glyph grid appeared **below the visible viewport** — the user had to scroll down the page to find it. It did not behave like a popup.

**Original CSS** (`5c69795`):
```css
.ct-glyph-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}
.ct-glyph-drawer {
  position: relative;
  width: 480px;
  max-width: 95vw;
  height: 100vh;
  ...
  animation: ct-drawer-in 0.22s ease; /* slide in from the right */
}
```

This *should* have produced a fixed full-height right-hand drawer. Despite `position: fixed; inset: 0`, the panel appeared in normal document flow at the bottom of the page.

**Fix attempt 1 (`8c28704`)** — Converted the side-drawer into a centred modal dialog:
```css
.ct-glyph-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.ct-glyph-drawer {
  position: relative;
  width: 680px;
  max-width: 100%;
  max-height: 88vh;
  border-radius: 14px;
  overflow: hidden;
  animation: ct-drawer-in 0.18s ease; /* scale + fade in */
}
```
Verified the new CSS was correctly served by the Vite dev server (fetched `/src/styles.css` directly and confirmed the updated rule). User reported it was **still not working** after a server restart.

**Fix attempt 2 (`6b924d7`)** — Root-caused as a potential **CSS containing-block issue**: if any ancestor element of `GlyphBrowserDrawer` (now or in the future) has `transform`, `filter`, `perspective`, `contain`, or `will-change: transform`, then `position: fixed` descendants are positioned relative to *that ancestor's box* instead of the viewport — so "centred" could mean centred within a 3000px-tall page section, i.e. far below the visible scroll position. No such property was found on current ancestors (`.ct-panel`, `.workspace`, `.app-shell`, `body` were all checked), but to make this **robust against any future styling**, the drawer is now rendered through a React portal straight to `document.body`:

```tsx
import { createPortal } from "react-dom";
...
return createPortal(
  <div className="ct-glyph-overlay">
    ...
  </div>,
  document.body,
);
```

This guarantees the overlay's `position: fixed` is always relative to the viewport, regardless of where `<GlyphBrowserDrawer />` sits logically in the component tree.

**Status:** Code-level fix is in. User needs to **hard-refresh the browser tab** (Ctrl+Shift+R) since the previous Vite dev server process was killed and restarted mid-session — the old tab's HMR socket may be stale. If the popup is *still* mispositioned after a hard refresh, the next debugging step is to inspect the live DOM with browser devtools (`getComputedStyle` on `.ct-glyph-overlay`, check `position`, and walk up `offsetParent` to find any element that became `offsetParent` for a `position: fixed` node — that element is the rogue containing block).

### 1.7 Bug 2 — "Line text" compose input too small

**Symptom:** The compose input showing the live glyph preview was too small to comfortably read script/ligature fonts.

**Fix (`8c28704`):**
```css
.ct-glyph-compose-input {
  padding: 12px 14px;       /* was 8px 10px */
  font-size: 1.7rem;        /* was 1.15rem */
  line-height: 1.3;         /* new */
}
```

---

## 2. Feature 2 — Design Recipe Embedded in SVG + On-Screen Table

### 2.1 What it is

Every Cake Topper design uses a per-line combination of font, size, and colour. Previously this information existed only in the live UI state — once exported, there was no record of "which font was Line 2?" The Design Recipe feature persists this information in two places:

1. **Embedded in the exported SVG** as an XML comment (machine/human-readable, survives the file).
2. **Shown on-screen** as a table in the app, directly below the export buttons (added in the second fix round, see §2.4).

### 2.2 Backend implementation

**`backend/app/models.py`** — `CakeTopperLineMetadata` gained two fields:
```python
font_name: str = ""
font_size_mm: float = 42.0
```

**`backend/app/cake_topper_engine.py`**:
- `_generate_line` now captures `font_info.full_name` and `cfg.font_size_mm` into the per-line `meta` dict.
- `generate()` passes these into `CakeTopperLineMetadata(...)` and passes the full `line_metadata` list into `_assemble_svg(...)`.
- `_assemble_svg` signature extended:
  ```python
  def _assemble_svg(
      groups: list[tuple[list[GeometryPath], str]],
      width: float,
      height: float,
      line_metadata: list[CakeTopperLineMetadata] | None = None,
  ) -> str:
  ```
  After `drawing.tostring()`, if `line_metadata` is present, a comment is built and string-spliced in immediately after the opening `<svg ...>` tag:
  ```python
  svg_str = drawing.tostring()
  if line_metadata:
      today = date.today().isoformat()
      recipe_lines = [
          f'  Line {i + 1}  "{m.text}"  —  {m.font_name or "Unknown"} · {m.font_size_mm}mm · {m.color}'
          for i, m in enumerate(line_metadata)
      ]
      comment = ("<!--\nEnS Designer — Cake Topper Recipe\n" + f"Generated: {today}\n\n"
                 + "\n".join(recipe_lines) + "\n-->")
      tag_start = svg_str.find("<svg")
      if tag_start != -1:
          tag_end = svg_str.find(">", tag_start) + 1
          svg_str = svg_str[:tag_end] + "\n" + comment + svg_str[tag_end:]
  return svg_str
  ```

Example output (verified via direct API call to `/api/cake-topper`):
```xml
<svg xmlns="http://www.w3.org/2000/svg" ...>
<!--
EnS Designer — Cake Topper Recipe
Generated: 2026-06-10

  Line 1  "happy"  —  Ayshana Script · 42.0mm · #000000
  Line 2  "birthday"  —  Ayshana Script · 42.0mm · #000000
--><defs />...
```

### 2.3 Frontend type changes

**`frontend/src/types/design.ts`** — `CakeTopperLineMetadata` interface gained:
```ts
font_name: string;
font_size_mm: number;
```

### 2.4 Bug — Metadata "not showing"

**Symptom (round 1):** User downloaded the SVG, opened it in a browser (`file:///.../appy_birthday.svg`), and saw only the rendered artwork — no visible metadata.

**Investigation:** Called `/api/cake-topper` directly and confirmed the recipe comment **was** present in the `svg` field of the response, correctly formatted, immediately after the opening `<svg>` tag.

**Root cause:** This was working as designed — **XML comments are never rendered visually** by browsers, image viewers, or LightBurn, and they don't affect cut geometry. The user was looking at the *rendered* SVG (as an image), where a comment is invisible by definition. The first round of documentation (§26.4 in the feature spec) explained this and pointed to "open in Notepad/VS Code or View Source" as the access method.

**Symptom (round 2):** User reported the metadata was *still* "not showing" — i.e. the text-editor-based explanation wasn't a satisfying fix from a UX standpoint (a cake-decorating business user shouldn't need to open dev tools to check what font was used).

**Fix (`6b924d7`)** — Added a visible **"Design recipe"** card in `CakeTopperPanel.tsx`, rendered directly under the export bar whenever a result exists:
```tsx
{meta && (
  <div className="ct-recipe">
    <h3 className="ct-recipe-title">Design recipe</h3>
    <p className="ct-recipe-hint">
      Saved with this design — also embedded as a comment at the top of the exported SVG file.
    </p>
    <table className="ct-recipe-table">
      <thead>
        <tr><th>Line</th><th>Text</th><th>Font</th><th>Size</th><th>Colour</th></tr>
      </thead>
      <tbody>
        {meta.lines.map((line, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{line.text}</td>
            <td>{line.font_name || "—"}</td>
            <td>{line.font_size_mm}mm</td>
            <td><span className="ct-recipe-swatch" style={{ background: line.color }} />{line.color}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

CSS added: `.ct-recipe`, `.ct-recipe-title`, `.ct-recipe-hint`, `.ct-recipe-table` (+ `th`/`td`), `.ct-recipe-swatch`.

**Note on PNG exports:** PNG is a raster format with no equivalent to an SVG comment. The Design Recipe table is the canonical on-screen reference regardless of which export format (SVG or PNG) is used; no PNG-specific metadata embedding was implemented (out of scope — "I don't need more than this" per user).

---

## 3. Supporting change — `textOverride` param on `callApi`

Required by §1.5 (Apply to Line N from the Glyph Browser). `CakeTopperPanel.tsx`'s `callApi` signature:

```ts
async function callApi(
  states: LineState[],
  gaps: number[],
  count: number,
  offsets: ...,
  outline: ... | undefined,
  preserveCanvas = true,
  textOverride?: string,
) {
  const activeText = textOverride ?? text;
  ...
}
```

Without `textOverride`, calling `setText(newFullText)` then immediately `callApi(...)` in the same handler would send the **old** `text` value to the backend (React state batching / stale closure). `textOverride` lets the caller pass the new value explicitly, bypassing the stale `text`.

This same mechanism (`preserveCanvas`) also ensures that applying a glyph-browser edit **never wipes the canvas** on error — only `handleGenerate` (the "Generate design" button) passes `preserveCanvas = false`.

---

## 4. Files touched (cumulative, both features)

| File | Change |
|---|---|
| `backend/app/models.py` | `font_name`, `font_size_mm` added to `CakeTopperLineMetadata` |
| `backend/app/cake_topper_engine.py` | Recipe comment injection in `_assemble_svg`; line metadata population in `_generate_line`/`generate()` |
| `backend/app/api/routes/fonts.py` | New `GET /{font_id}/file`, `GET /{font_id}/characters`, `_categorise_codepoint`, `_glyph_label` |
| `frontend/src/components/GlyphBrowserDrawer.tsx` | New component; later wrapped in `createPortal(..., document.body)` |
| `frontend/src/components/CakeTopperPanel.tsx` | Browse button, `glyphBrowserLineIndex` state, `applyGlyphBrowserText`, `textOverride` param on `callApi`, "Design recipe" table |
| `frontend/src/types/design.ts` | `CharacterInfo`, `FontCharacterMap`, `font_name`/`font_size_mm` on `CakeTopperLineMetadata` |
| `frontend/src/services/generationApi.ts` | `fetchFontCharacters(fontId)` |
| `frontend/src/styles.css` | Glyph drawer styles (overlay/backdrop/drawer/compose/filters/grid), `.ct-recipe*` table styles |
| `docs/phases/CAKE_TOPPER_FEATURE_SPECIFICATION.md` | §25 (Glyph Browser), §26 (modal fix + recipe doc), §27 (portal + on-screen recipe) |

---

## 5. Open items / next steps for the next agent

1. ~~**Confirm the Glyph Browser modal renders correctly** after a hard browser refresh.~~ **RESOLVED 2026-06-10 23:37 GMT+1** — root cause was a stray extra `}` at `frontend/src/styles.css:1857` (right after `.fa-empty-note`), which unbalanced the stylesheet and silently dropped the `.ct-glyph-overlay` rule from the parsed CSSOM. The portal was correct all along. Fix: removed the stray brace. See `glyph-browser-modal-positioning-fix-report.md` for full root-cause analysis and live validation.
2. No automated UI tests exist for either feature — manual verification only (`npx tsc --noEmit` passes, confirmed clean).
3. PNG metadata embedding was explicitly descoped per user ("I don't need more than this") — do not add unless requested.
4. Both dev servers (backend `:8000`, frontend `:5173`) were restarted as of commit `6b924d7` and confirmed healthy (`/api/fonts` → 200, `/` → 200).
