# Glyph Browser Modal Positioning Bug — Senior Solution Architect Fix Plan

## 1. Purpose

This document gives an agentic coding AI a precise, implementation-ready process to fix the current **Glyph Browser modal positioning bug** in the local EnS Designer web application.

The goal is **not** to rewrite the feature or change backend logic.

The goal is to inspect the live DOM/CSS, confirm the true cause, and apply the smallest maintainable fix so the Glyph Browser opens as a centred modal in the visible viewport.

---

## 2. Project Context

Project: **EnS Designer**  
Application type: local web app  
Backend: **FastAPI**  
Frontend: **React / TypeScript / Vite**  
Relevant feature: **Glyph Browser Drawer / Modal**  
Primary affected area: frontend modal layout and CSS

The Glyph Browser allows the user to browse special font glyphs, including PUA glyphs, ligatures, ornaments, swashes, and alternates, and apply them to a selected cake topper line.

---

## 3. Current Bug Summary

### What is broken

When the user clicks **Browse** next to a line font selector, the Glyph Browser appears, but it is positioned incorrectly.

### Current observed behaviour

Based on the latest screenshot evidence:

- The page backdrop/dim overlay appears.
- The Glyph Browser component is visible.
- The glyph data loads.
- The selected line context is correct.
- The modal is positioned at the **bottom-left** of the screen/page.
- It is not centred in the visible viewport.
- The user experience still feels broken.

### Expected behaviour

Clicking **Browse** should open a modal/popup that is:

- Centred in the visible viewport.
- Rendered above a dimmed backdrop.
- Independent of page scroll.
- Not anchored to bottom-left.
- Not requiring the user to scroll to find it.
- Internally scrollable if the glyph list is long.

---

## 4. Important Updated Diagnosis

The issue has changed from the earlier handoff.

The original issue was that the drawer appeared below the fold and the user had to scroll to find it.

The latest screenshot proves the situation is now different:

- The modal is no longer fully hidden below the page.
- The Glyph Browser component is mounting.
- The glyph API is working.
- The font and line context are working.
- The Design Recipe table is working.
- The failure is now specifically **modal positioning/alignment**.

Therefore, do **not** start by investigating backend endpoints, glyph categorisation, font loading, or recipe metadata.

The next investigation must focus on:

- Live DOM structure.
- React portal mounting.
- Computed CSS for `.ct-glyph-overlay`.
- Computed CSS for `.ct-glyph-drawer`.
- CSS specificity/stale CSS.
- Whether the browser is running the latest frontend code.

---

## 5. Confirmed Working Areas

The screenshot confirms these areas are working:

1. **Component mount**
   - The Glyph Browser is visible.

2. **Backdrop**
   - The page is dimmed behind the modal.

3. **Glyph data**
   - Glyph categories and glyph cells are visible.

4. **Line context**
   - The header shows the selected font and line:
     - `Anton - Line 2: Birthday`

5. **Design Recipe UI**
   - The Design Recipe table is visible under the export bar.

6. **Frontend/backend communication**
   - The glyph browser has enough data to render the glyph list.

These areas should not be modified unless new evidence proves they are involved.

---

## 6. Most Likely Root Cause

The most likely root cause is a **frontend CSS or DOM mounting issue**, specifically one of the following:

### High likelihood

The `.ct-glyph-overlay` CSS is not applying the intended modal-centering rules.

Examples:

- `display: flex` is missing or overridden.
- `align-items: center` is missing or overridden.
- `justify-content: center` is missing or overridden.
- `position: fixed` is missing or overridden.
- `inset: 0` is missing or overridden.
- The overlay height is not equal to viewport height.

### Medium-high likelihood

The `.ct-glyph-drawer` has a rule that anchors it to bottom-left or prevents centring.

Examples:

- `position: fixed`
- `position: absolute`
- `bottom: 0`
- `left: 0`
- unwanted transform
- unwanted margin
- unwanted width/height rules

### Medium likelihood

The React portal is not active in the currently running app.

The handoff says the modal should be rendered using:

```tsx
createPortal(..., document.body)
```

However, the running browser may still be using stale code, stale HMR state, or an earlier implementation.

### Medium likelihood

The frontend browser tab is stale after dev server restart.

A hard refresh may be required:

```text
Ctrl + Shift + R
```

---

## 7. Files to Inspect First

Inspect these files first and do not broaden the scope unless evidence requires it.

### Frontend

```text
frontend/src/components/GlyphBrowserDrawer.tsx
frontend/src/components/CakeTopperPanel.tsx
frontend/src/styles.css
```

### Secondary validation only

```text
frontend/src/services/generationApi.ts
frontend/src/types/design.ts
```

### Backend validation only if glyph loading is broken

```text
backend/app/api/routes/fonts.py
backend/app/cake_topper_engine.py
backend/app/models.py
```

Do not edit backend files for a modal positioning bug unless new evidence proves a backend issue.

---

## 8. Required Investigation Sequence

Before changing code, perform this sequence exactly.

### Step 1 — Hard refresh and reproduce

1. Start backend dev server.
2. Start frontend Vite dev server.
3. Open the app.
4. Perform a hard refresh:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
5. Click **Browse** on Line 2 or any available line.

Expected result:

- If the modal is centred, no code change is needed.
- If it is still bottom-left, continue.

---

### Step 2 — Inspect live DOM

Open browser DevTools and inspect the modal.

Run:

```js
const overlay = document.querySelector('.ct-glyph-overlay');
const drawer = document.querySelector('.ct-glyph-drawer');

console.log('overlay:', overlay);
console.log('drawer:', drawer);
console.log('overlay parent:', overlay?.parentElement);
console.log('overlay rect:', overlay?.getBoundingClientRect());
console.log('drawer rect:', drawer?.getBoundingClientRect());
```

Expected:

```text
overlay parent should be document.body
overlay top should be 0
overlay left should be 0
overlay width should match viewport width
overlay height should match viewport height
drawer should be inside the visible viewport
```

If `overlay.parentElement` is not `body`, the portal is not active or not implemented correctly.

---

### Step 3 — Inspect computed overlay CSS

Run:

```js
const overlay = document.querySelector('.ct-glyph-overlay');

if (overlay) {
  const s = getComputedStyle(overlay);
  console.log({
    position: s.position,
    inset: s.inset,
    top: s.top,
    right: s.right,
    bottom: s.bottom,
    left: s.left,
    display: s.display,
    alignItems: s.alignItems,
    justifyContent: s.justifyContent,
    zIndex: s.zIndex,
    width: s.width,
    height: s.height,
    padding: s.padding,
    boxSizing: s.boxSizing,
  });
}
```

Expected values:

```text
position: fixed
top: 0px
right: 0px
bottom: 0px
left: 0px
display: flex
alignItems: center
justifyContent: center
height: viewport height
width: viewport width
```

If these values are not correct, fix `.ct-glyph-overlay` CSS.

---

### Step 4 — Inspect computed drawer CSS

Run:

```js
const drawer = document.querySelector('.ct-glyph-drawer');

if (drawer) {
  const d = getComputedStyle(drawer);
  console.log({
    position: d.position,
    width: d.width,
    maxWidth: d.maxWidth,
    height: d.height,
    maxHeight: d.maxHeight,
    margin: d.margin,
    transform: d.transform,
    top: d.top,
    right: d.right,
    bottom: d.bottom,
    left: d.left,
    overflow: d.overflow,
    boxSizing: d.boxSizing,
  });
}
```

Expected:

```text
position: relative or static
no bottom-left anchoring
no fixed/absolute positioning unless deliberately justified
maxHeight based on viewport
overflow handled internally
```

If the drawer is positioned bottom-left by CSS, remove that rule.

---

### Step 5 — Confirm no duplicate/old overlay exists

Run:

```js
console.log('overlay count:', document.querySelectorAll('.ct-glyph-overlay').length);
console.log('drawer count:', document.querySelectorAll('.ct-glyph-drawer').length);
```

Expected:

```text
overlay count: 1
drawer count: 1
```

If duplicates exist, investigate stale render or conditional rendering issue.

---

## 9. Correct Fix Strategy

### Preferred fix

Keep the React portal architecture and correct the CSS.

The modal should be structurally independent from the app layout.

The portal should render the overlay directly under `document.body`.

### Required portal pattern

In `frontend/src/components/GlyphBrowserDrawer.tsx`:

```tsx
import { createPortal } from "react-dom";
```

The component should return:

```tsx
return createPortal(
  <div className="ct-glyph-overlay">
    <div className="ct-glyph-drawer" role="dialog" aria-modal="true">
      {/* existing modal content */}
    </div>
  </div>,
  document.body
);
```

If needed for safety:

```tsx
if (typeof document === "undefined") return null;
```

Do not move modal rendering back into normal document flow.

---

## 10. Recommended CSS Target

In `frontend/src/styles.css`, ensure the final effective styles match this intent.

```css
.ct-glyph-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

.ct-glyph-drawer {
  position: relative;
  width: 680px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  box-sizing: border-box;
}
```

The glyph list area should scroll internally, not the page.

Use the actual existing class names for the modal body/grid area. If they exist, apply this pattern:

```css
.ct-glyph-body,
.ct-glyph-grid-wrap {
  overflow-y: auto;
}
```

If the existing layout uses different class names, adapt this only to the internal scroll container, not the overlay.

---

## 11. What Not to Change

Do not change:

```text
backend/app/api/routes/fonts.py
backend/app/cake_topper_engine.py
backend/app/models.py
frontend/src/services/generationApi.ts
frontend/src/types/design.ts
```

unless investigation proves a specific issue there.

Do not change:

- Glyph categorisation.
- Font loading logic.
- API route paths.
- Design Recipe metadata.
- SVG export logic.
- PNG export logic.
- `textOverride` in `callApi`.
- Backend recipe generation.
- Canvas generation logic.

---

## 12. Anti-Patterns to Avoid

Do not:

- Add arbitrary `margin-top`.
- Add negative margins.
- Add hardcoded bottom/left offsets.
- Position the drawer based on current scroll.
- Require the user to scroll to the modal.
- Add global `body` or `.app-shell` hacks unless proven necessary.
- Rewrite `CakeTopperPanel.tsx`.
- Rewrite the Glyph Browser feature.
- Change backend APIs for a frontend modal positioning issue.
- Silence runtime errors without understanding them.
- Leave temporary `console.log` statements in the final code.
- Introduce a new modal library.
- Add duplicate modal state.
- Remove `textOverride`.
- Add PNG metadata embedding.
- Make the SVG comment visually rendered inside the cut artwork.

---

## 13. Step-by-Step Implementation Plan

## Step 1 — Inspect

### Goal

Confirm the bug after a hard refresh and gather live DOM/CSS evidence.

### Files to inspect

```text
frontend/src/components/GlyphBrowserDrawer.tsx
frontend/src/styles.css
```

### Exact action

- Hard-refresh the app.
- Open Browse.
- Inspect `.ct-glyph-overlay`.
- Inspect `.ct-glyph-drawer`.
- Run the console commands from Sections 8.2 to 8.5.

### Expected outcome

You know whether the failure is:

- missing portal,
- wrong overlay CSS,
- wrong drawer CSS,
- duplicate overlay,
- or stale browser state.

---

## Step 2 — Confirm Root Cause

### Goal

Identify the exact mismatch between intended modal layout and live DOM/CSS.

### Files to inspect

```text
frontend/src/components/GlyphBrowserDrawer.tsx
frontend/src/styles.css
```

### Exact action

Use the computed style output to identify which rule is wrong.

### Expected outcome

A precise statement such as:

```text
Root cause confirmed: .ct-glyph-overlay is mounted to body but computed justify-content is flex-start because a later CSS rule overrides it.
```

or:

```text
Root cause confirmed: .ct-glyph-overlay is not mounted under body, meaning the portal fix is not active in the running code.
```

or:

```text
Root cause confirmed: .ct-glyph-drawer has position: fixed; bottom: 0; left: 0, anchoring it bottom-left.
```

---

## Step 3 — Apply Minimal Fix

### Goal

Fix only the confirmed layout issue.

### Files to change

Likely:

```text
frontend/src/components/GlyphBrowserDrawer.tsx
frontend/src/styles.css
```

### Exact action

If portal is missing:

- Add `createPortal`.
- Return the overlay through `document.body`.

If overlay CSS is wrong:

- Correct `.ct-glyph-overlay`.

If drawer CSS is wrong:

- Correct `.ct-glyph-drawer`.

If CSS specificity is the issue:

- Remove or rewrite the conflicting rule.
- Do not use `!important` unless there is no better scoped solution.

### Expected outcome

The modal opens centred in the visible viewport.

---

## Step 4 — Refactor Only If Required

### Goal

Avoid broad changes.

### Files to change

None unless the confirmed root cause requires it.

### Exact action

Do not refactor unless:

- modal state is duplicated,
- multiple overlays are rendered,
- or the drawer is conditionally mounted in two places.

### Expected outcome

Small, focused diff.

---

## Step 5 — Validate

### Goal

Confirm the fix and protect existing working functionality.

### Manual validation checklist

1. Hard-refresh browser.
2. Click Browse.
3. Confirm modal is centred.
4. Scroll the page, open Browse again.
5. Confirm modal is still centred.
6. Confirm the backdrop covers the page.
7. Confirm only the internal glyph list scrolls.
8. Click a glyph.
9. Confirm it appends to Line Text.
10. Click Apply.
11. Confirm modal closes.
12. Confirm line/canvas updates.
13. Confirm Design Recipe table still appears.
14. Export SVG.
15. Confirm exported SVG still contains recipe comment in source/text editor.
16. Confirm PNG export still works.

---

## Step 6 — Clean Up

### Goal

Remove debug artefacts.

### Exact action

Remove:

- `console.log`
- temporary CSS outlines
- temporary debug labels
- unused imports
- dead code

### Expected outcome

Production-ready final diff.

---

## 14. Acceptance Criteria

The fix is complete only when all of the following are true:

- Clicking Browse opens the Glyph Browser modal centred in the visible viewport.
- The modal is not bottom-left anchored.
- The modal is not below the fold.
- The modal does not require page scroll.
- The overlay is mounted under `document.body`.
- The overlay covers the viewport.
- The drawer remains within the viewport.
- The glyph grid scrolls internally.
- Escape closes the modal.
- Apply to Line updates the selected line.
- Existing canvas output is preserved.
- Design Recipe table still works.
- SVG export still includes the embedded comment.
- No unrelated files were changed.
- No temporary debugging code remains.

---

## 15. Final Summary Format Required From the Coding Agent

After fixing, provide the final response in this format:

```text
Root cause confirmed:
[Explain the confirmed cause based on DOM/CSS evidence.]

Files changed:
- [file 1]
- [file 2]

Fix applied:
[Explain the minimal code/CSS change.]

Validation performed:
- [manual test 1]
- [manual test 2]
- [manual test 3]

Regression checks:
- [check 1]
- [check 2]

Notes:
[Any remaining risk or follow-up, if applicable.]
```

---

## 16. Key Constraint

This is a modal positioning bug.

Do not turn it into a backend, SVG, glyph parsing, or recipe metadata task unless live evidence proves those areas are broken.