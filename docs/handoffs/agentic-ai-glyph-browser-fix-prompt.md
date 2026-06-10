# Agentic AI Prompt — Fix Glyph Browser Modal Positioning Bug

You are acting as a **Senior Front-End Debugging Agent and Principal React Engineer** working on the local EnS Designer web application.

Your task is to fix the current **Glyph Browser modal positioning bug**.

You must first read the full fix plan here:

```text
glyph-browser-modal-positioning-fix-plan.md
```

Treat that file as the source of truth for the debugging process, constraints, acceptance criteria, and validation steps.

---

## Current Bug

The Glyph Browser opens when the user clicks **Browse**, but it appears anchored at the **bottom-left** of the screen/page instead of being centred in the visible viewport.

The latest screenshot evidence confirms:

- The Glyph Browser component mounts.
- The backdrop/dim overlay appears.
- Glyph categories and glyph cells load.
- The selected font and line context are correct.
- The Design Recipe table is visible and working.
- The remaining issue is modal layout/positioning.

Therefore, this is primarily a **frontend DOM/CSS/modal positioning issue**, not a backend or glyph API issue.

---

## Primary Objective

Fix the modal so that clicking **Browse** opens the Glyph Browser:

- centred in the visible viewport,
- above a dimmed backdrop,
- independent of page scroll,
- not bottom-left anchored,
- not below the fold,
- with the glyph grid scrolling internally if needed.

---

## Files to Inspect First

Start with only these files:

```text
frontend/src/components/GlyphBrowserDrawer.tsx
frontend/src/components/CakeTopperPanel.tsx
frontend/src/styles.css
```

Only inspect or change other files if the evidence clearly requires it.

---

## Mandatory First Step

Before editing code:

1. Start the backend and frontend dev servers.
2. Open the app.
3. Hard-refresh the browser using `Ctrl + Shift + R`.
4. Click **Browse**.
5. Open DevTools.
6. Inspect `.ct-glyph-overlay` and `.ct-glyph-drawer`.

Run:

```js
const overlay = document.querySelector('.ct-glyph-overlay');
const drawer = document.querySelector('.ct-glyph-drawer');

console.log('overlay:', overlay);
console.log('drawer:', drawer);
console.log('overlay parent:', overlay?.parentElement);
console.log('overlay rect:', overlay?.getBoundingClientRect());
console.log('drawer rect:', drawer?.getBoundingClientRect());

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

console.log('overlay count:', document.querySelectorAll('.ct-glyph-overlay').length);
console.log('drawer count:', document.querySelectorAll('.ct-glyph-drawer').length);
```

Do not start coding until you have identified which of these is wrong:

- portal mounting,
- overlay CSS,
- drawer CSS,
- duplicate overlay,
- stale runtime/CSS.

---

## Expected DOM/CSS

The overlay should:

```text
be mounted directly under document.body
position: fixed
top/right/bottom/left: 0
display: flex
align-items: center
justify-content: center
width: viewport width
height: viewport height
```

The drawer should:

```text
be inside the visible viewport
not be fixed to bottom-left
not depend on page scroll
have viewport-based max-height
allow internal scrolling for glyph content
```

---

## Recommended Fix Direction

Keep or restore the React portal pattern in:

```text
frontend/src/components/GlyphBrowserDrawer.tsx
```

The component should render the overlay via:

```tsx
import { createPortal } from "react-dom";

return createPortal(
  <div className="ct-glyph-overlay">
    <div className="ct-glyph-drawer" role="dialog" aria-modal="true">
      {/* existing modal content */}
    </div>
  </div>,
  document.body
);
```

If needed:

```tsx
if (typeof document === "undefined") return null;
```

Then ensure the CSS in:

```text
frontend/src/styles.css
```

matches this modal intent:

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

Adapt internal scroll styles to the actual existing modal body/grid class names.

---

## Do Not Change

Do not change any of the following unless live evidence proves they are directly involved:

```text
backend/app/api/routes/fonts.py
backend/app/cake_topper_engine.py
backend/app/models.py
frontend/src/services/generationApi.ts
frontend/src/types/design.ts
```

Do not change:

- glyph categorisation,
- font loading,
- API routes,
- SVG export,
- PNG export,
- Design Recipe table,
- recipe metadata,
- canvas generation,
- `textOverride` in `callApi`.

---

## Anti-Patterns to Avoid

Do not:

- use arbitrary margins or negative offsets,
- pin the modal using `bottom` or `left`,
- position based on scroll,
- require the user to scroll to the modal,
- add global layout hacks,
- rewrite the feature,
- introduce a modal library,
- use `!important` unless absolutely unavoidable and justified,
- leave temporary console logs,
- change unrelated files.

---

## Validation Required

After the fix, validate:

1. Hard-refresh the browser.
2. Click Browse.
3. Confirm the modal opens centred in the visible viewport.
4. Scroll the page and open Browse again.
5. Confirm the modal remains centred.
6. Confirm the backdrop covers the viewport.
7. Confirm the glyph grid scrolls internally.
8. Click a glyph and confirm it appends to Line Text.
9. Click Apply and confirm the line/canvas updates.
10. Confirm Escape closes the modal.
11. Confirm Design Recipe table still appears.
12. Export SVG and confirm the recipe comment still exists in the file source.
13. Confirm PNG export still works.
14. Confirm no duplicate overlays remain in the DOM.
15. Remove all temporary debug code.

---

## Final Response Required

When done, respond using this exact structure:

```text
Root cause confirmed:
[Explain the confirmed cause using DOM/CSS evidence.]

Files changed:
- [file 1]
- [file 2]

Fix applied:
[Explain the minimal code/CSS change.]

Validation performed:
- [manual validation 1]
- [manual validation 2]
- [manual validation 3]

Regression checks:
- [regression check 1]
- [regression check 2]

Notes:
[Any remaining risk or follow-up, if applicable.]
```

Remember: this is a modal positioning issue. Fix the confirmed frontend layout problem only.