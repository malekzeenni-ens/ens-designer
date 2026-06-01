# Canvas Line Movement Drag Bug - Resolution Handoff

**Date:** 2026-06-01
**Project:** EnS Designer - local web app (FastAPI backend + React/TypeScript/Vite frontend)
**Branch:** `main`
**Status:** Resolved and manually verified by user.

---

## Summary

Cake Topper line movement now works from the SVG preview. Users can generate a multi-line cake topper, drag an individual line in the preview, and have the frontend apply the drag delta as backend-side `manual_x_offset_mm` / `manual_y_offset_mm` values before regenerating the SVG.

The numeric X/Y controls were already working. The broken part was preview drag movement.

---

## Root Cause

The previous `PreviewPanel` drag implementation selected the line immediately inside `onPointerDown`:

```ts
onSelectLine?.(lineIndex);
```

That state update could trigger a React re-render during the setup of the drag gesture. The drag closure still held the original handle DOM element, which could become detached or otherwise no longer be the visible handle. The implementation also relied on `window` pointer listeners and the SVG host used fragile inline sizing for overlay-to-SVG coordinate conversion.

The result was:

- Pointer down appeared to work because selection styling changed.
- Pointer move did not visibly move the handle.
- Pointer up did not reliably produce a usable mm delta.

---

## Fix Implemented

Commit:

```text
d038786 Fix canvas line drag movement
```

### `frontend/src/components/PreviewPanel.tsx`

- Uses native `document` pointer listeners in capture phase for `pointermove`, `pointerup`, and `pointercancel`.
- Tracks the active `pointerId` so unrelated pointer events are ignored.
- Cleans up listeners on drag completion and component unmount.
- Defers `onSelectLine` until pointer up so selection state does not re-render the handle during drag setup.
- Adds `data-line-index` to each handle and re-queries the current handle if React replaces the original DOM node.
- Applies temporary drag feedback with `translate3d(...)`.
- Converts pixel drag distance to mm using the current SVG host bounding rect and the backend-reported canvas dimensions.

### `frontend/src/styles.css`

- Changes `.preview-svg-host` to stable shrink-wrap sizing:

```css
display: block;
width: fit-content;
max-width: 100%;
```

- Makes the overlay transparent to pointer events except for handles:

```css
.preview-drag-overlay { pointer-events: none; }
.preview-drag-handle { pointer-events: auto; }
```

- Adds `will-change: transform` for smoother temporary drag feedback.

---

## Verification

Automated checks run successfully:

```powershell
cd frontend
cmd /c npx tsc --noEmit
cmd /c npm run build
```

Manual verification:

- User confirmed the app opens after Vite cache recovery.
- User confirmed drag movement appears to be working.

---

## Runtime Notes

The active local repo uses the Python virtual environment at the repository root, not `backend/.venv`.

Backend start:

```powershell
Start-Process -FilePath "cmd" -ArgumentList "/c","cd backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --reload" -WindowStyle Hidden
```

Frontend start:

```powershell
Start-Process -FilePath "cmd" -ArgumentList "/c","cd frontend && npm run dev" -WindowStyle Hidden
```

Frontend forced dependency re-optimization, useful after blank screen errors such as `504 (Outdated Optimize Dep)`:

```powershell
Start-Process -FilePath "cmd" -ArgumentList "/c","cd frontend && npm run dev -- --force" -WindowStyle Hidden
```

If Chrome still shows stale optimized dependency errors after a forced Vite restart, hard refresh with `Ctrl + Shift + R` or enable DevTools Network `Disable cache` and refresh once.

---

## Current Expected Behavior

1. Open `http://127.0.0.1:5173/`.
2. Go to the Cake Topper tab.
3. Generate a design such as `Happy Birthday`.
4. Drag a dashed line overlay in the SVG preview.
5. The overlay moves during drag.
6. On release, the line's canvas position offset updates and the SVG regenerates with the moved position.
