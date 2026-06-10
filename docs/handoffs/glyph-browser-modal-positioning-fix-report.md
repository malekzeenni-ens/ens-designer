# Glyph Browser Modal Positioning Bug — Fix Report

**Date:** 2026-06-10 23:37 GMT+1
**Project:** EnS Designer — local web app (FastAPI backend + React/TypeScript/Vite frontend)
**Branch:** `main`
**Status:** Fixed and verified live (agent-browser). Ready to commit.

---

## Summary

The Glyph Browser modal (opened via the **Browse** button next to a line's
font selector) was rendering anchored at the bottom-left of the page /
below the fold instead of centred in the viewport, despite the React
portal (`createPortal(..., document.body)`) and the `.ct-glyph-overlay` /
`.ct-glyph-drawer` CSS already matching the intended modal-centring design
from prior fix rounds (`8c28704`, `6b924d7`).

## Root Cause

`frontend/src/styles.css` line 1857 contained a stray, unmatched closing
brace `}` immediately after the `.fa-empty-note` rule:

```css
.fa-empty-note {
  margin: 0;
  color: var(--ens-muted);
  font-size: 0.86rem;
  line-height: 1.5;
}
}   /* <- extra brace, unbalanced the whole stylesheet */

/* ============================================================
   Glyph Browser Drawer
   ============================================================ */

.ct-glyph-overlay {
  position: fixed;
  inset: 0;
  ...
}
```

This unbalanced the entire file (brace depth went from 0 to -1 at line
1857 and never recovered through EOF). The browser's CSS parser dropped
the very next rule — `.ct-glyph-overlay` — from the live CSSOM entirely.
Verified via DevTools:

- `document.styleSheets[0].cssRules` contained every other `.ct-glyph-*`
  rule (`.ct-glyph-backdrop`, `.ct-glyph-drawer`, `.ct-glyph-header`, etc.)
  but **not** `.ct-glyph-overlay`.
- Computed style of `.ct-glyph-overlay` showed `position: static`,
  `display: block` — none of the intended `position: fixed; display: flex;
  align-items: center; justify-content: center; inset: 0` rules applied.
- This caused the overlay to lay out in normal document flow at the
  bottom of the page content (matching the reported "bottom-left /
  below the fold" symptom), dragging the centred drawer down with it.

The portal mounting (`overlay.parentElement === document.body`) was
already correct and not the issue.

## Fix

Removed the single stray `}` on `frontend/src/styles.css:1857`. This
restores the file's brace balance to 0 and lets `.ct-glyph-overlay` parse
as a normal top-level rule again. No other CSS or component code changed.

```diff
 .fa-empty-note {
   margin: 0;
   color: var(--ens-muted);
   font-size: 0.86rem;
   line-height: 1.5;
 }
-}

 /* ============================================================
    Glyph Browser Drawer
```

## Validation (live, via agent-browser against running dev servers)

1. Confirmed `.ct-glyph-overlay` now present in `document.styleSheets[0].cssRules`
   with `position: fixed`, `display: flex`, `alignItems: center`,
   `justifyContent: center`, `inset: 0`.
2. Generated a design, clicked **Browse** on Line 1: overlay rect = full
   viewport (0,0 → 1262×568); drawer rect centred (x=291, y=34, 680×500);
   `overlayParentIsBody: true`; overlay/drawer counts = 1 each.
   Screenshot confirms a centred modal dialog over a dimmed backdrop.
3. Scrolled the page 400px and reopened Browse: overlay/drawer rects
   unchanged — still viewport-relative and centred, independent of scroll.
4. Clicked a glyph cell: appended to the "Line text" compose input.
5. Pressed Escape: overlay count → 0 (modal closes).
6. Re-opened, appended a glyph, clicked "Apply to Line 1": modal closed,
   Design Recipe table re-rendered with updated line data, SVG preview
   intact.
7. Confirmed only one `.ct-glyph-overlay` / `.ct-glyph-drawer` exist at a
   time — no duplicates.

## Files Changed

- `frontend/src/styles.css` (1 line removed)

## Out of Scope / Untouched

Per the fix plan, no changes were made to:
- `backend/app/api/routes/fonts.py`, `cake_topper_engine.py`, `models.py`
- `frontend/src/services/generationApi.ts`, `frontend/src/types/design.ts`
- Glyph categorisation, font loading, SVG/PNG export, Design Recipe
  metadata, `textOverride` in `callApi`.

## Notes

This was a one-character CSS syntax bug, not a structural/portal issue.
The earlier portal + CSS rewrite (commit `6b924d7`) was already correct
but never took effect because this brace error silently dropped the
overlay's positioning rule from the parsed stylesheet. SVG/PNG download
buttons were not exercised end-to-end in this session (no filesystem
download verification), but the preview and recipe metadata feeding them
were confirmed working.
