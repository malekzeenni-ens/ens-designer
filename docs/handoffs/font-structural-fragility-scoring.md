# Font Structural Fragility Scoring

## Document Information

Date: 2026-06-11
Status: Complete
Area: Cake Topper Designer — font recommendations / dropdown grouping

---

## 1. Background

The Cake Topper "Base font" dropdown groups fonts by suitability (Top 20,
Next Best 20, Script/Serif/Sans by suitability, Use With Caution, Not
Recommended). These groupings came from two sources:

1. A hand-curated list of ~38 fonts (`CAKE_TOPPER_FONT_RECOMMENDATIONS` in
   `frontend/src/config/cakeTopperFontRecommendations.ts`) with manually
   assigned scores, risk levels, and notes.
2. A regex/name-based heuristic (`classifyFontHeuristically`) for the
   remaining ~1000 fonts, which guessed structural safety from words in the
   font name (e.g. "Bold", "Black", "Thin", "Script").

### The problem

While reviewing a rendered design ("Happy" in **Sunlight Script Bold**, a
manually-curated "Top 20" font with score 88 and risk level "medium"), the
actual laser-cut output showed extensive thin/fragile connecting strokes and
swashes — inconsistent with a Top 20, low-risk classification. The font's
*name* contains "Bold", but its *outlines* have large amounts of hairline
detail. Name-based heuristics cannot detect this.

---

## 2. Approach: measure the actual font outlines

Rather than continue guessing from font names, we now render each font's
real glyph outlines and measure stroke fragility directly.

### 2.1 Analysis script

`backend/scripts/font_fragility_analysis.py`:

- Enumerates every font known to the app via the existing `FontCatalog`
  (project fonts in `fonts/` + Windows system fonts) — 1050 fonts.
- Renders the sample phrase `"Happy Birthday 123"` for each font using
  Pillow/FreeType, at the same em-square scale the export pipeline uses
  (`FONT_SIZE_MM = 42`, see `outline_extractor.py`), at 8 px/mm resolution.
- Binarizes the rendered glyph mask and erodes it (3x3 structuring element,
  4 iterations ≈ 1mm) — the minimum safe cut width for 3mm acrylic.
- Computes:
  - `ink_area_px` — total glyph ink pixels
  - `safe_area_px` — ink pixels that survive erosion (i.e. part of a stroke
    ≥ 1mm thick)
  - `fragile_fraction` = 1 − safe/ink
  - `structural_score` = 100 × safe/ink (0–100, higher = more
    laser-cut-safe)

Run time: ~1 minute for all 1050 fonts.

Output: `backend/scripts/font_fragility_results.json` (per-font metrics,
sorted by score — regenerated artifact, not committed).

### 2.2 Frontend lookup table

A one-line Python conversion produces
`frontend/src/config/fontStructuralScores.json` — a `{normalisedFullName:
score}` map (1050 entries, ~26KB), committed to the repo.

### 2.3 Integration (`cakeTopperFontRecommendations.ts`)

`getFontClassification(font)` now:

1. Gets the existing base classification (manual curated entry, or the
   name-based heuristic) — unchanged, still provides `type`, `bestUse`,
   `whyItWorks`, `pairingSuggestions`, etc.
2. Looks up the font's measured `structuralScore`.
3. If found (and the font isn't a symbol/icon font — those keep
   `category: "not_recommended"` regardless, since their problem is
   semantic, not structural), overrides:
   - `score` → `round(structuralScore)`
   - `riskLevel` → `low` (≥75) / `medium` (≥45) / `high` (<45)
   - `category` → demoted to `"use_with_caution"` if `structuralScore < 40`,
     or if a `top_10`/`next_best_10` font scores `< 60`
   - `rank` / `recommendedRank` cleared if the category changed (so the
     font sorts out of Top 20/Next Best correctly)

---

## 3. Validation

| Font | Old score / category | New structural score / category |
|---|---|---|
| Sunlight Script Bold | 88, Top 20, risk "medium" | **44, Use With Caution, risk "high"** |
| Bickham Script Pro Semibold | 61, Next Best 20 | **32, Use With Caution, risk "high"** |
| Anton | 95, Top 20 | 83, Top 20 (unchanged) |
| Cooper Black | 94, Top 20 | 83, Top 20 (unchanged) |
| Edwardian Script ITC | 52, Use With Caution | 22, Use With Caution (unchanged) |
| Wingdings / Webdings | 15, Not Recommended | unchanged (symbol fonts excluded) |

Dropdown group sizes before → after:

| Group | Before | After |
|---|---|---|
| Top 20 Cake Topper Fonts | 20 | 16 |
| Next Best 20 Fonts | 21 | 14 |
| Script Fonts (by suitability) | 70 | 51 |
| Serif Fonts (by suitability) | 59 | 56 |
| Sans & Display Fonts (by suitability) | 203 | 191 |
| Other Fonts (Unranked) | 569 | 401 |
| Use With Caution | 98 | 311 |
| Not Recommended / Symbol Fonts | 10 | 10 |

Verified live in the running app (port 5173) via `agent-browser` —
TypeScript build is clean (`npx tsc --noEmit`).

---

## 4. Files changed

- `backend/scripts/font_fragility_analysis.py` (new) — analysis tool, rerun
  whenever fonts are added/removed.
- `frontend/src/config/fontStructuralScores.json` (new) — generated lookup
  table consumed by the frontend.
- `frontend/src/config/cakeTopperFontRecommendations.ts` — added
  `getStructuralScore`, `riskLevelFromStructuralScore`,
  `applyStructuralScore`, and wired them into `getFontClassification`. Also
  manually corrected the `Sunlight Script Bold` entry's notes/risk based on
  the original visual finding.
- `frontend/src/components/CakeTopperPanel.tsx` — earlier change in this
  session: replaced the single "All Fonts A-Z" group with type/suitability
  groups (Script/Serif/Sans & Display "by suitability", "Other Fonts
  (Unranked)", "Use With Caution", "Not Recommended").

## 5. Regenerating scores

If fonts are added, removed, or replaced in `fonts/`:

```bash
python backend/scripts/font_fragility_analysis.py
python -c "
import json
data = json.load(open('backend/scripts/font_fragility_results.json'))
def norm(s):
    return ' '.join(s.lower().split())
out = {norm(r['full_name']): r['structural_score'] for r in data}
json.dump(out, open('frontend/src/config/fontStructuralScores.json', 'w'), indent=0, sort_keys=True)
"
```

## 6. Possible follow-ups (not done)

- The 4 demotion/threshold constants (1mm minimum width, 40/60/75/45 score
  cutoffs) are first-pass values validated against a handful of known-good
  and known-bad fonts. Could be tuned further against real LightBurn test
  cuts.
- `backend/scripts/font_fragility_results.json` (full per-font metrics) is
  not committed — regenerate locally if needed for deeper analysis.
