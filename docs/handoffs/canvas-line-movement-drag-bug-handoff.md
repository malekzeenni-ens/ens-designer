# Canvas Line Movement — Drag Bug Handoff

**Date:** 2026-06-01  
**Project:** EnS Designer — local web app (FastAPI backend + React/TypeScript/Vite frontend)  
**Feature branch:** main (all changes committed)  
**Status:** Feature partially working. Numeric X/Y inputs work. SVG selection overlay renders. Drag movement does NOT trigger.

---

## 1. What Was Built

A canvas drag-to-move feature for the Cake Topper tab. The user can type `Happy Birthday` into the Cake Topper tab, generate a 2-line design, then drag either line on the SVG preview to reposition it. The final exported SVG must reflect the moved position (movement is backend-side, in mm).

### Working correctly
- Typing X/Y values in the **Canvas position offset** numeric inputs inside each line accordion card correctly moves the line and regenerates the SVG.
- The dashed-border **selection overlay** renders over each line in the preview — clicking a line shows/changes the selected state visual.
- The **Reset** button appears when offsets are non-zero and correctly zeroes them.
- All backend tests pass (169 passed, 2 skipped).
- TypeScript builds clean (0 errors).

### Broken
- **Dragging a line in the preview does not move it.** `onPointerDown` on the overlay handle rect appears to fire (the selection border updates), but neither visual movement during drag nor any offset change on release occurs.

---

## 2. Console Error Observed

```
Uncaught (in promise) Error: Params are not set
    at ee.getParams (mf.js:1:155029)
    at new Qa (mf.js:1:153421)
    at mf.js:1:156650
```

**Assessment:** `mf.js` is a minified third-party file — NOT from our codebase. In Vite dev mode all our files are unminified and named by their actual filenames. This error is from a browser extension (likely a tracking/analytics extension or a browser's built-in feature). It is an unhandled promise rejection and should not interrupt synchronous pointer event handlers. Treat it as a red herring unless evidence emerges otherwise.

**Verification step:** Open the browser in an Incognito window with extensions disabled and retry the drag. If it works there, the extension is the cause.

---

## 3. Architecture — What to Know

### Stack
- **Backend:** FastAPI + Python 3.12, port 8000. Start: `cd backend && .venv\Scripts\uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --reload`
- **Frontend:** React 18 + TypeScript + Vite, port 5173. Start: `cd frontend && npm run dev`
- **No cloud dependencies.** Fully local.

### Cake Topper data flow
1. User types text → frontend splits into words (up to 4) → each word is one line.
2. User clicks Generate → `POST /api/cake-topper` with `line_configs[]` including `manual_x_offset_mm` / `manual_y_offset_mm`.
3. Backend engine assembles SVG with paths translated to final canvas positions (alignment + manual offset both applied).
4. Backend returns `svg`, `png_base64`, and `metadata.lines[]` with per-line `x_offset_mm`, `y_offset_mm`, `width_mm`, `height_mm`.
5. Frontend renders SVG in preview + shows overlay handles positioned using those metadata mm values.
6. On drag release, frontend adds `dxMm/dyMm` to the current `manualXOffsetMm/manualYOffsetMm` in state, then calls the API again.

### Manual offset is purely additive
In `backend/app/cake_topper_engine.py` lines 115–121:
```python
manual_x = cfg.manual_x_offset_mm
manual_y = cfg.manual_y_offset_mm
x_translate = x_offset - geom.bounds.min_x + manual_x
y_translate = y_cursor - geom.bounds.min_y + manual_y
translated = _translate_paths(geom.paths, x_translate, y_translate, prefix=f"L{i}-")
```
Moving a line does not affect letter overlap, floating component positions, or stacking of other lines.

---

## 4. File Map — Changed Files

| File | Purpose |
|---|---|
| `backend/app/models.py` | `CakeTopperLineConfig` has `manual_x_offset_mm: float = 0.0` and `manual_y_offset_mm: float = 0.0`. `CakeTopperLineMetadata` has `y_offset_mm`, `manual_x_offset_mm`, `manual_y_offset_mm`. |
| `backend/app/cake_topper_engine.py` | Applies manual offsets during canvas assembly (lines 115–137). |
| `frontend/src/types/design.ts` | `CakeTopperLineConfig` and `CakeTopperLineMetadata` interfaces updated to include the new fields. |
| `frontend/src/components/PreviewPanel.tsx` | **The buggy file.** Renders SVG + overlay with draggable handle rects. Contains the `startDrag` function. |
| `frontend/src/components/CakeTopperPanel.tsx` | `LineState` type has `manualXOffsetMm/manualYOffsetMm`. `handleLineDrag` accumulates drag deltas. Position controls UI added inside each line accordion card. |
| `frontend/src/styles.css` | `.preview-svg-host`, `.preview-drag-overlay`, `.preview-drag-handle`, `.preview-drag-handle--selected`, `.ct-position-*` styles added (around line 870). |
| `tests/test_cake_topper.py` | `TestManualOffsets` class with 5 tests added at the end. |

---

## 5. Current PreviewPanel Implementation (the buggy component)

Full file: `frontend/src/components/PreviewPanel.tsx`

```tsx
import { useRef } from "react";

interface LineBox {
  xMm: number; yMm: number; wMm: number; hMm: number;
}

interface PreviewPanelProps {
  svg: string | null;
  lineBoxes?: LineBox[];
  canvasWidthMm?: number;
  canvasHeightMm?: number;
  selectedLine?: number | null;
  onSelectLine?: (i: number) => void;
  onLineDrag?: (i: number, dxMm: number, dyMm: number) => void;
}

export function PreviewPanel({ svg, lineBoxes, canvasWidthMm, canvasHeightMm,
  selectedLine, onSelectLine, onLineDrag }) {

  const hostRef = useRef<HTMLDivElement>(null); // ref on the svg host div

  function startDrag(e: React.PointerEvent<HTMLDivElement>, lineIndex: number) {
    e.preventDefault();
    onSelectLine?.(lineIndex);                    // ← triggers React re-render (setSelectedLine)

    const handleEl = e.currentTarget as HTMLDivElement;
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev: PointerEvent) {
      handleEl.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`;
    }

    function onUp(ev: PointerEvent) {
      handleEl.style.transform = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      const host = hostRef.current;
      if (!host || !canvasWidthMm || !canvasHeightMm) return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dxMm = (ev.clientX - startX) * (canvasWidthMm / rect.width);
      const dyMm = (ev.clientY - startY) * (canvasHeightMm / rect.height);
      if (Math.abs(dxMm) > 0.05 || Math.abs(dyMm) > 0.05) {
        onLineDrag?.(lineIndex, dxMm, dyMm);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const showOverlay = svg && lineBoxes && lineBoxes.length > 0 && canvasWidthMm && canvasHeightMm;

  return (
    <section className="preview-panel">
      {svg ? (
        <div className="preview-surface">
          <div ref={hostRef} className="preview-svg-host">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
            {showOverlay && (
              <div className="preview-drag-overlay">
                {lineBoxes!.map((box, i) => (
                  <div
                    key={i}
                    className={`preview-drag-handle${selectedLine === i ? " preview-drag-handle--selected" : ""}`}
                    style={{
                      left:   `${(box.xMm / canvasWidthMm!) * 100}%`,
                      top:    `${(box.yMm / canvasHeightMm!) * 100}%`,
                      width:  `${(box.wMm / canvasWidthMm!) * 100}%`,
                      height: `${(box.hMm / canvasHeightMm!) * 100}%`,
                    }}
                    onPointerDown={(e) => startDrag(e, i)}
                    title={`Drag to move Line ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="preview-empty">Preview</div>
      )}
    </section>
  );
}
```

### Relevant CSS (styles.css ~line 870)

```css
.preview-panel {
  min-height: 440px;
  border: 1px solid #d9d6ca;
  border-radius: 8px;
  overflow: hidden;     /* ← creates stacking context, clips overflow */
  background: #ffffff;
}

.preview-surface {
  display: grid;
  min-height: 440px;
  place-items: center;  /* centers .preview-svg-host */
  padding: 32px;
}

.preview-svg-host {
  position: relative;   /* ← overlay anchors to this */
  display: inline-block;
  line-height: 0;
}

.preview-svg-host svg {
  display: block;
  max-width: 100%;
  max-height: 360px;
  width: auto;
  height: auto;
}

.preview-drag-overlay {
  position: absolute;
  inset: 0;             /* covers full .preview-svg-host */
  cursor: default;
}

.preview-drag-handle {
  position: absolute;
  border: 2px dashed transparent;
  border-radius: 2px;
  cursor: grab;
  touch-action: none;
  transition: border-color 0.15s, background 0.15s;
  box-sizing: border-box;
}

.preview-drag-handle--selected {
  border-color: #18241f;
  background: rgba(24, 36, 31, 0.05);
}
```

---

## 6. Three Failed Implementation Attempts

All three were variations on the same theme. None produced working drag.

### Attempt 1 — `setPointerCapture` on overlay, `onPointerMove`/`onPointerUp` on overlay via React synthetic events
```
overlayRef.current?.setPointerCapture(e.pointerId)  // in onPointerDown on handle
onPointerMove={handleOverlayMove}  // on overlay div
onPointerUp={handleOverlayUp}      // on overlay div
```
**Why it failed (diagnosed):** When `setPointerCapture(id)` is called on the overlay DOM node, the browser sends subsequent pointer events directly to that node, bypassing React's root-level event delegation. React's synthetic `onPointerMove` / `onPointerUp` on the overlay never fired.

### Attempt 2 — `setPointerCapture` on handle, `onPointerMove`/`onPointerUp` on handle via React synthetic events
```
e.currentTarget.setPointerCapture(e.pointerId)  // in onPointerDown on handle
onPointerMove={handlePointerMove}  // on each handle div
onPointerUp={handlePointerUp}      // on each handle div
```
**Why it failed (suspected):** Same root issue — pointer capture redirects events at the browser level, bypassing React's event delegation at the root container. This is a documented React + pointer-capture incompatibility in some browser versions.

### Attempt 3 — Native `window.addEventListener` (current code)
```ts
window.addEventListener("pointermove", onMove);
window.addEventListener("pointerup", onUp);
```
**Expected to work** because native `window` listeners are not routed through React's event delegation system. `pointermove` on `window` fires unconditionally when the mouse moves. But the user reports the drag still does not work.

**Unverified at time of handoff:** Whether `onMove` actually fires during drag. No `console.log` was added to verify. The root cause of Attempt 3 failure is unknown.

---

## 7. Diagnostic Steps for the Next Agent

Run these in order before changing any code.

### Step 1 — Rule out the browser extension
Open the app at `http://127.0.0.1:5173` in a **private/incognito window** with **all extensions disabled**. Try dragging a line. If it works → the `mf.js` browser extension is the culprit (it may be intercepting pointer events or causing an uncaught error that the browser silences with "preventDefault").

### Step 2 — Verify `startDrag` fires
In `PreviewPanel.tsx`, add `console.log("startDrag", lineIndex, e.clientX, e.clientY)` as the first line of `startDrag`. Click (not drag) a line handle in the preview. The log should appear. If it does NOT appear, the `onPointerDown` on the handle div is not firing — suspect a CSS `pointer-events` issue or the overlay not rendering above the SVG.

### Step 3 — Verify `onMove` fires
Add `console.log("onMove", ev.clientX, ev.clientY)` inside the `onMove` closure. Trigger a drag and move the mouse. If this log does NOT appear after Step 2 confirms `startDrag` fires, then `window.addEventListener("pointermove")` is not working — extremely unusual, but it could indicate:
- `e.preventDefault()` is somehow preventing pointer events from propagating (test by removing `e.preventDefault()`)
- The window listener is being added but immediately removed (test by not calling `removeEventListener` until Step 4)
- The pointer type is touch/pen and `touch-action: none` is not in effect — test by adding `style="touch-action: none"` directly on the handle div inline

### Step 4 — Verify `handleEl` is valid after re-render
`onSelectLine?.(lineIndex)` calls `setSelectedLine` which triggers a React re-render. After the re-render, React may recreate the handle div DOM node if keys change or the component unmounts/remounts. Add `console.log("handleEl after re-render", handleEl.isConnected)` inside `onMove`. If `handleEl.isConnected` is `false`, the DOM node was replaced by React and the style mutation is going to a detached element.

### Step 5 — Verify `hostRef` is valid in `onUp`
Add `console.log("hostRef in onUp", hostRef.current, hostRef.current?.getBoundingClientRect())` at the start of `onUp`. If `hostRef.current` is null or its `getBoundingClientRect()` returns `{ width: 0, height: 0 }`, the mm conversion will produce 0 and `onLineDrag` will not be called (because `Math.abs(dxMm) > 0.05` will be false).

### Step 6 — Verify the handle rect is actually positioned over the SVG ink
Open Chrome DevTools → Elements tab → find `.preview-drag-overlay` → find the `.preview-drag-handle` divs. Check their computed `left`, `top`, `width`, `height`. Cross-check against the response from `POST /api/cake-topper` → `metadata.lines[0]` → `x_offset_mm`, `y_offset_mm`, `width_mm`, `height_mm`, `canvas_width_mm`, `canvas_height_mm`. The handle should cover the ink region of its line.

---

## 8. Suspected Root Causes (in order of likelihood)

### 8A — `handleEl` becomes detached after re-render (most likely)
`onSelectLine?.(lineIndex)` is called inside `startDrag` BEFORE the window listeners are added. This call triggers `setSelectedLine(lineIndex)`, which causes React to re-render `PreviewPanel`. During re-render, React may re-create the handle div DOM node (replacing the old one). The `handleEl` captured in the closure is now a detached DOM node. `handleEl.style.transform = "..."` runs on the detached node with no visible effect.

**Fix:** Remove `onSelectLine?.(lineIndex)` from `startDrag`. Instead, update selection state only on `pointerup` (or don't update it at all during drag). Alternatively, use `useRef` array to hold stable refs to all handle DOM elements and index into those instead of using `e.currentTarget`.

### 8B — `overflow: hidden` on `.preview-panel` clips the transform
When `handleEl.style.transform = translate(dx, dy)` moves the handle rect partially outside the bounds of `.preview-panel`, the `overflow: hidden` on `.preview-panel` clips it. The visual feedback is happening but is being clipped. This would not affect the final `onLineDrag` call.

**Fix:** Change `.preview-panel { overflow: visible; }` and check if the drag visual appears.

### 8C — `hostRef.current` bounding rect is zero in `onUp`
If `.preview-svg-host` has zero rendered dimensions (because the `inline-block` + `max-width: 100%` circular sizing produces a degenerate result), `canvasWidthMm / rect.width` produces `Infinity` or `NaN`, and the `Math.abs(dxMm) > 0.05` guard correctly suppresses the callback. No drag is registered.

**Fix:** Log `hostRef.current.getBoundingClientRect()` in `onUp`. If zero, fix the CSS sizing of `.preview-svg-host`. The simplest fix: replace `display: inline-block` with `display: block` and add an explicit `width: fit-content` (or just `width: 100%`).

### 8D — Browser extension interfering with pointer events
The `mf.js` extension adds its own `pointerdown` listener to `window` and calls `stopImmediatePropagation()` or throws an error that causes the browser to skip subsequent listeners in the chain. This would prevent both our `onPointerDown` React handler and the window `pointermove` listener from firing.

**Fix:** Test in incognito without extensions (Step 1 above).

---

## 9. Recommended Fix Approach

Try in this order:

**Fix A (for 8A):** In `startDrag`, move `onSelectLine?.(lineIndex)` to AFTER the window listeners are added, or remove it entirely from `startDrag` and only call it in `onUp`. This prevents a React re-render from replacing the handle DOM node while the drag closure is setting up.

```ts
function startDrag(e: React.PointerEvent<HTMLDivElement>, lineIndex: number) {
  e.preventDefault();
  // DON'T call onSelectLine here — it triggers re-render and may invalidate handleEl
  
  const handleEl = e.currentTarget as HTMLDivElement;
  const startX = e.clientX;
  const startY = e.clientY;

  function onMove(ev: PointerEvent) {
    handleEl.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`;
  }

  function onUp(ev: PointerEvent) {
    handleEl.style.transform = "";
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    onSelectLine?.(lineIndex);  // ← moved here, after drag is done

    const host = hostRef.current;
    if (!host || !canvasWidthMm || !canvasHeightMm) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dxMm = (ev.clientX - startX) * (canvasWidthMm / rect.width);
    const dyMm = (ev.clientY - startY) * (canvasHeightMm / rect.height);
    if (Math.abs(dxMm) > 0.05 || Math.abs(dyMm) > 0.05) {
      onLineDrag?.(lineIndex, dxMm, dyMm);
    }
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
```

**Fix B (for 8C — CSS sizing):** In `styles.css`, change `.preview-svg-host`:
```css
.preview-svg-host {
  position: relative;
  display: block;          /* was: inline-block */
  width: fit-content;      /* shrink-wrap the SVG without circular sizing */
  line-height: 0;
}
```

**Fix C (alternative drag approach — if pointer events still broken):** Replace the DIV-overlay drag with SVG-native drag. The SVG returned by the backend is injected via `dangerouslySetInnerHTML`. Instead of injecting it raw, parse it, add `<rect>` elements as drag handles for each line (using the mm bounding boxes, styled `fill="transparent" stroke="none" cursor="grab"`), and wire `onPointerDown` on those SVG rects. SVG pointer events are reliable and don't have the same React delegation issues.

---

## 10. What NOT to Change

- Do not modify `backend/app/cake_topper_engine.py` — the offset logic is correct and tested.
- Do not modify `backend/app/models.py` — the model fields are correct.
- Do not modify `tests/test_cake_topper.py` — all 169 tests pass.
- Do not change `CakeTopperPanel.tsx`'s `handleLineDrag` or `resetPosition` functions — they are correct.
- Do not add boolean union, welding, structural validation, or cloud features.
- Do not break existing SVG/PNG export behaviour.

---

## 11. Environment

- **OS:** Windows 11 Home
- **Shell:** PowerShell
- **Python:** 3.12 in `.venv` (backend/)
- **Node:** npm available via cmd.exe (not directly via PowerShell `Start-Process`)
- **Backend start (PowerShell):** `Start-Process -FilePath "cmd" -ArgumentList "/c","cd backend && .venv\Scripts\uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --reload" -WindowStyle Hidden`
- **Frontend start (PowerShell):** `Start-Process -FilePath "cmd" -ArgumentList "/c","cd frontend && npm run dev" -WindowStyle Hidden`
- **Tests:** `cd backend && python -m pytest ../tests/ -q`
- **TypeScript check:** `cd frontend && npx tsc --noEmit`
