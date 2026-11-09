# KEYCHAIN_DESIGNER_USER_JOURNEY.md

## Document Information

Version: 1.0
Status: Planning baseline for K0 authorised on 2026-11-09
Document Type: User Journey and UX Specification
Project: EnS Designer (AI SVG Generator)
Owner: Etch 'N' Shine
Date: 2026-11-06
Companion document: `docs/phases/KEYCHAIN_DESIGNER_IMPLEMENTATION_PLAN.md`

---

# 1. Purpose

Define the end-to-end experience for a dedicated **Keychain** workspace tab in EnS Designer.

The tab turns a name into a production-ready, laser-cut keychain SVG in seconds. It keeps the EnS Designer geometry engine (HarfBuzz shaping, Shapely booleans, real keyhole subtraction, structural validation) and adds the speed and focused workflow seen in the public vectorsfile.com keychain generator.

---

# 2. Background: What We Learned From vectorsfile.com

The vectorsfile.com generator was reverse-engineered on 2026-11-06 using REA. It runs entirely in the browser (opentype.js + ClipperLib) and has no backend.

## 2.1 Adopt (their strengths)

| # | Learning | How the Keychain tab adopts it |
|---|---|---|
| L1 | Instant live preview on every slider change | Fast preview endpoint, font caching, debounced and cancellable requests, last good preview always visible |
| L2 | Solid backing: only the external offset contour is kept | "Fill letter counters" on by default |
| L3 | Ring auto-snaps so it always overlaps the body | Ring auto-snap, plus our existing wall and neck validation |
| L4 | i/j dots automatically joined to the stem (25% overlap) | Auto-join floating dots, built on our existing floating-component detector |
| L5 | One "Keychain Width" control that includes the ring | Target final size (width or height) solved by the engine |
| L6 | Per-letter drag, scale, flip and rotate | Letter Inspector with per-glyph transforms |
| L7 | Text and cut line in different colours (red and black) | Separate, configurable layer colours for LightBurn |
| L8 | 100-step undo/redo; mm/cm/inch display | Same, with keyboard shortcuts |

## 2.2 Do not adopt (their weaknesses)

| # | Weakness found | EnS Designer position |
|---|---|---|
| W1 | Each character is drawn alone (`font.getPath(ch)`), which breaks kerning, ligatures, script joins and Arabic | Keep HarfBuzz shaping of the whole word |
| W2 | The width solve stretches horizontally only, which distorts letters and makes the offset uneven | Uniform scaling only; offset is applied in true mm after scaling |
| W3 | Fixed 100 × 75 mm SVG canvas; designs can overflow the artboard | Canvas fitted to content, true mm units |
| W4 | Export template writes the opening `<svg` tag twice | Valid SVG, covered by tests |
| W5 | Text exported as straight-line segments | Text keeps its original Bézier curves |
| W6 | Ring size 1–30 mm with no structural checks | Production-safe ranges with wall, neck and clearance validation |
| W7 | 10-second download cooldown | No artificial friction |

## 2.3 Already ours and must be preserved

- HarfBuzz shaping and FontTools outline extraction
- Overlap engine with per-gap control
- Floating-component detection with manual dot offsets
- Stroke buffer for thin script strokes (0–0.6 mm)
- Ring/keyhole with a real hole subtracted from the backing and compound-path output
- Wall-thickness, neck-width and hole-to-text proximity warnings
- Font catalog, Manual Fonts, visual Font Picker and Font Adviser scoring
- Material profiles
- The Cake Topper Designer, which must behave exactly as it does today

---

# 3. Target Users and Jobs

| Persona | Context | Job to be done |
|---|---|---|
| **Production operator** (primary) | Fulfilling a personalised Etsy order | "Turn the customer's name into a cut-ready keychain file that imports cleanly into LightBurn, with no manual fixing." |
| **Designer / owner** | Creating listing mock-ups and new product styles | "Try fonts and styles quickly and see what looks best before committing." |
| **Repeat-order operator** | Many orders with the same style, different names | "Keep all settings and just swap the name, again and again." |

---

# 4. Experience Principles

1. **Preview first.** A preview appears from the first keystroke. No "Generate" button is needed to see the result.
2. **Safe by default.** Defaults always produce a cuttable, one-piece, LightBurn-ready keychain.
3. **Cutability wins.** If aesthetics and structure conflict, the app warns and offers a fix. It never silently produces a fragile part (Coding Agent Master Prompt, Principle 1).
4. **One primary size number.** The user sets the finished size they will sell. The engine works out everything else.
5. **Progressive disclosure.** Text, font and size are always visible. Backing, ring and letter fine-tuning sit in collapsible sections.
6. **Never lose work.** Undo/redo, state kept when switching tabs, recipe saved in every export.
7. **No silent failures.** Every warning is visible and actionable.

---

# 5. Keychain Styles

The user picks a style once, near the top. The style decides what gets exported, not how the geometry is built.

| Style | Physical product | Export layers | MVP |
|---|---|---|---|
| **Engraved** (default) | One piece: backing is cut, name is engraved | `CUT_BACKING` (cut colour) + `ENGRAVE_TEXT` (engrave colour) in one SVG | Yes |
| **Layered** | Two pieces glued: backing in one colour, name in another | `CUT_BACKING` + `CUT_TEXT`; one combined SVG or two separate SVG files | Yes |
| **Cut-out name** | Welded name is the body; ring attached to the letters, no backing | `CUT_TEXT_BODY` (connectivity engine required) | Future (see Plan §13) |

---

# 6. Screen Layout

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Workspace tabs:  Designer | Keychain | Sizing Assistant | Font Adviser …  │
├──────────────────────────────────────────────────────────────────────────┤
│ Top bar:  Name [ Sarah            ]  Style (Engraved|Layered)   ↶ ↷        │
│           Preset ▾                          Status: ● Ready   [Export ▾]  │
├───────────────────────────────┬──────────────────────────────────────────┤
│ Controls (scrolls)            │ Preview canvas                           │
│                               │                                          │
│ ▸ Font            (open)      │   ┌────────────────────────────┐          │
│ ▸ Size            (open)      │   │  ◯                         │          │
│ ▸ Backing                     │   │    S a r a h               │          │
│ ▸ Ring / Keyhole              │   └────────────────────────────┘          │
│ ▸ Letters & Spacing           │   W 60.00 mm × H 24.31 mm   Zoom − ⊡ +    │
│ ▸ Layers & Colours            │   View: Both | Backing | Text             │
│                               │                                          │
│                               │ Production Check  ● 0 errors ● 1 warning │
│                               │   ⚠ Ring neck 4.6 mm < 5 mm  [Fix]        │
├───────────────────────────────┴──────────────────────────────────────────┤
│ Bottom bar:  Export size 60.0 × 24.3 mm · 3 mm Cast Acrylic               │
│              [Download SVG]  [Download PNG]  [Next name ↵]                │
└──────────────────────────────────────────────────────────────────────────┘
```

At narrow widths (below 1100 px) the controls collapse into a drawer below the preview. The preview always stays visible.

---

# 7. User Journey: Stage by Stage

Each stage lists the user's goal, what they do, how the system responds, the performance target and the edge cases.

## Stage 0: Enter the Keychain tab

- **Goal:** start a keychain without setup.
- **User action:** clicks the **Keychain** tab.
- **System response:**
  - Opens with smart defaults (see §8). If the user has worked here before in this session, the previous state is restored. The tab keeps its state when switching away and back, the same as the Designer tab.
  - Name field focused. Placeholder: "Type a name…".
  - Fonts load from the shared font catalog (no second fetch).
- **Target:** tab interactive in under 300 ms.
- **Edge cases:**
  - Backend not running: inline banner "Backend is not running. Start the local server and retry." with a Retry button. This reuses the existing message.

## Stage 1: Type the name

- **Goal:** see the keychain for this name immediately.
- **User action:** types "Sarah".
- **System response:**
  - The preview updates after typing pauses for 150 ms.
  - While an update is in flight, the last good preview stays on screen with a subtle "updating" indicator. The canvas never goes blank.
  - The W × H readout updates with each preview.
- **Targets:**
  - First preview (cold, font not yet cached) under 800 ms.
  - Later updates under 150 ms at p95 for names up to 12 characters.
- **Edge cases:**
  - Empty field: shows the placeholder keychain "Name" in grey, with export disabled.
  - Characters missing from the font: a warning chip names them, for example "'ł' is not in this font". A one-click "Find fonts that support this name" filters the Font Picker.
  - Long names (more than 16 characters): an info hint suggests a larger target width or a condensed font. Hard limit: 40 characters.
  - Spaces are kept as a single line (for example "Mr Bear"). Multi-line keychains are out of MVP scope.
  - Right-to-left and complex scripts (Arabic): rendered correctly through HarfBuzz. Preview and export use the same geometry.
  - Emoji and other unsupported symbols: shown as missing-glyph warnings, never as a crash.

## Stage 2: Choose the style

- **Goal:** match the physical product being made.
- **User action:** toggles **Engraved** or **Layered**.
- **System response:**
  - The preview legend and layer colours update.
  - Layered style adds "Text pieces" checks to the Production Check (floating parts, minimum stroke).
  - Export options change: Layered offers "One SVG" or "Two SVG files".
- **Target:** under 150 ms (no geometry change, only export layering).

## Stage 3: Choose the font

- **Goal:** find a font that looks good **and** cuts well.
- **User action:** opens the Font section. Uses the visual Font Picker, where each option renders the actual name.
- **System response:**
  - Manual Fonts group appears first, as elsewhere in the app.
  - Each font shows its **keychain suitability badge** from the Font Adviser: Recommended / OK / Caution.
  - Filters: Script, Bold/Display, Serif, Sans.
  - Hovering or arrowing through fonts previews them on the canvas once the user pauses on one for 250 ms. Enter or click commits the choice.
- **Target:** font switch under 400 ms cold, under 150 ms when the font is cached.
- **Edge cases:**
  - Font fails to load: error chip; the previous font stays selected.
  - Font lacks a glyph in the name: badge "Missing: ł" on that font in the list.

## Stage 4: Set the finished size

- **Goal:** hit the product size being sold (for example a 60 mm keychain).
- **User action:**
  - Chooses **Width** (default) or **Height** as the target.
  - Enters a value or uses the slider.
  - Display units: mm / cm / inch.
- **System response:**
  - The engine scales the text **uniformly**, re-applies the backing offset in true mm, attaches the ring, and solves until the finished outer size equals the target within ±0.05 mm.
  - The readout shows the achieved W × H.
  - Ring and hole stay at their exact physical sizes; they are never scaled.
- **Ranges:** width 25–200 mm (default 60); height 10–100 mm.
- **Edge cases:**
  - Target too small for the ring plus offset: error "Minimum size for this name is 31.4 mm" with a [Set to minimum] fix.
  - Target cannot be reached within tolerance: warning showing the achieved size. Export is still allowed.

## Stage 5: Adjust the backing

- **Goal:** a clean, strong backing shape.
- **Controls:**

  | Control | Default | Range | Notes |
  |---|---|---|---|
  | Backing offset | 3.0 mm | 1.0–10.0 mm | Distance from text to cut line |
  | Fill letter counters | On | On/Off | Solid body (vectorsfile behaviour). Off keeps inner cut-outs. |
  | Smooth outline | 0.5 mm | 0–3.0 mm | Rounds off notches between letters (closing operation) |
  | Reinforce thin strokes | 0 mm | 0–0.6 mm | The existing stroke buffer, mainly for Layered style |

- **System response:** live preview. The Production Check updates (single-piece backing, minimum feature width).
- **Edge cases:**
  - Backing splits into more than one piece (letters far apart, small offset): error with a fix "Increase offset to X mm" or "Reduce letter spacing".

## Stage 6: Place the ring / keyhole

- **Goal:** a keyring hole that is strong and well positioned.
- **Controls:**
  - Ring on/off (default on).
  - Position: Top-left (default), Top-centre, Top-right, Left-middle, Right-middle, Custom.
  - Outer diameter: 10–15 mm, default 12 (existing production-safe range).
  - Hole diameter: 4–6 mm, default 5 (existing range).
  - Fine X/Y offset.
- **Canvas interaction:**
  - Drag the ring directly. Dragging runs at 60 fps using a ghost handle (the existing PreviewPanel technique).
  - On release, the ring **auto-snaps** so it overlaps the body with at least the minimum neck width.
  - The arrow keys nudge the selected ring by 0.1 mm; Shift+arrow nudges by 1 mm.
- **System response:** wall thickness, neck width and hole-to-text clearance are shown next to the ring controls with a status chip (Safe / Warning).
- **Edge cases:**
  - Ring dragged far away: snaps back to the nearest valid position and shows the toast "Ring snapped to body".
  - Auto-snap can be turned off in the ring section for advanced users. Validation still runs.

## Stage 7: Fine-tune letters and spacing

- **Goal:** fix the few cases where defaults are not perfect (tight script joins, a dot that looks off).
- **Controls:**
  - Overall letter overlap: Light / Auto / Medium / Strong / Custom (reuses the overlap engine).
  - Per-gap overlap list (reuses the Cake Topper gap UI pattern).
  - **Auto-join i/j dots**: on by default; dot overlap 25% (range 10–50%).
  - **Letter Inspector:** click a letter on the canvas to select it, then:
    - Nudge X/Y (arrow keys, or drag on the canvas).
    - Scale (50–200%).
    - Rotate (−45° to +45°).
    - Dot X/Y offset (if the letter has a floating dot).
    - Reset letter.
- **System response:** the selected letter is highlighted on the canvas. Changes apply live.
- **Notes:**
  - Letters are selected by **glyph cluster**, not by raw character. Ligatures (for example "fi") are selected as one unit. The inspector label shows the cluster text.
  - Flip is not included; mirrored letters are not a real customer need and caused winding bugs in the reference tool.

## Stage 8: Production Check

- **Goal:** know the file is safe to cut before exporting.
- **UI:**
  - A panel under the preview with counts (errors / warnings / passed).
  - Each item has a plain-language message and, where possible, a one-click **Fix**.
  - Items can be clicked to highlight the problem area on the canvas.

| Check | Severity | Fix action |
|---|---|---|
| Backing is one piece | Error | Increase offset / reduce spacing |
| Ring wall thickness ≥ 3 mm | Warning | Increase outer diameter / reduce hole |
| Ring neck width ≥ 5 mm | Warning | Snap ring closer |
| Hole clear of text | Warning | Move ring / increase offset |
| Backing minimum feature ≥ material minimum | Warning | Increase smoothing / offset |
| Text pieces: no tiny floating parts (Layered) | Warning | Enable dot auto-join |
| Text minimum stroke ≥ material minimum (Layered) | Warning | Apply stroke buffer 0.3 mm |
| Missing glyphs | Warning | Find supporting fonts |
| Target size reached | Info/Warning | — |

- **Rule:** errors block nothing silently. Export with errors is allowed only after an explicit confirmation ("Export anyway").

## Stage 9: Export

- **Goal:** get the file into LightBurn.
- **Actions:**
  - **Download SVG**: one file. In Layered style a choice of one combined file or two files (backing and text).
  - **Download PNG**: a transparent mock-up for listings or customer approval.
- **File contents:**
  - True mm units; canvas fitted to the design with a 2 mm margin.
  - Named groups: `CUT_BACKING`, `ENGRAVE_TEXT` or `CUT_TEXT`.
  - Distinct layer colours: backing `#000000`, text `#FF0000` (configurable).
  - Text keeps its Bézier curves. The backing is a compound path with the real hole.
  - Recipe embedded as an SVG comment and as JSON metadata (font, size, offset, ring, transforms, app version).
- **Filename:** `<name>-keychain-<width>mm.svg` (sanitised), for example `sarah-keychain-60mm.svg`.
- **Targets:** export under 1.5 s including PNG.
- **Also:**
  - Each export is saved to Keychain history.
  - No cooldown.

## Stage 10: Repeat and return

- **Next name** (key production feature): clears and focuses the name field and keeps every other setting. Enter in the name field after exporting triggers it.
- **History:** recent keychain recipes listed in the Keychain tab. One click reloads a recipe into the editor.
- **Undo/redo:** 100 steps, Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z). Typing in the name field merges into one undo step per pause.

---

# 8. Smart Defaults

| Setting | Default | Reason |
|---|---|---|
| Style | Engraved | One piece, most common, simplest to cut |
| Font | First Manual Font with "Recommended" keychain badge; else first Manual Font | Fast path for the operator's usual fonts |
| Size | Width 60 mm | Common acrylic name keychain size |
| Backing offset | 3 mm | Existing outline default |
| Fill counters | On | Solid, strong body |
| Smooth outline | 0.5 mm | Removes slivers between letters |
| Ring | On, top-left, 12 mm outer / 5 mm hole | Existing production-safe ring values |
| Ring auto-snap | On | Prevents disconnected rings |
| Overlap | Auto (1.0 mm) | Existing overlap default |
| Dot auto-join | On, 25% | Proven in the reference tool |
| Material | 3 mm Cast Acrylic | Existing Name Sign preset |
| Layer colours | Backing `#000000`, text `#FF0000` | Separate LightBurn layers on import |

## Presets (top-bar dropdown)

- Name Keychain: 60 mm wide
- Mini Charm: 40 mm wide, ring 10/4 mm
- Bag Tag: 90 mm wide, offset 4 mm, ring 15/6 mm

---

# 9. Interaction and Feedback Rules

| Situation | Behaviour |
|---|---|
| Slider drag | Preview requests sent while dragging, after 120 ms without movement; final request on release |
| Typing | Request after a 150 ms pause; one undo step per pause |
| Canvas drag (ring/letter) | Ghost moves at 60 fps; geometry request on release |
| Request in flight + new change | Previous request is cancelled; only the newest response is applied |
| Request fails | Last good preview stays; inline error with Retry; no blank canvas |
| Slow response (more than 600 ms) | "Updating…" indicator; controls stay usable |
| Tab switch | State preserved |

---

# 10. Accessibility

- Every control has a visible label, keyboard focus style and an ARIA label.
- Canvas selection works by keyboard: Tab cycles through letters and the ring; arrow keys nudge; Escape deselects.
- Status uses icon plus text, never colour alone. Layer colours are shown in a legend with names.
- Respects the app's light/dark appearance setting and the Etch N Shine design system.

---

# 11. Performance Budget Summary

| Interaction | Target |
|---|---|
| Tab interactive | < 300 ms |
| First preview (cold font) | < 800 ms |
| Preview update, ≤ 12 glyphs, warm | < 150 ms p95 (server) / < 250 ms p95 end-to-end |
| Font switch, cached | < 150 ms |
| Canvas drag | 60 fps |
| Export SVG + PNG | < 1.5 s |

These are stricter than the general project targets (preview < 5 s) because live editing is the core of this feature.

---

# 12. Success Metrics

- An operator goes from opening the tab to a downloaded SVG for a typical name in **under 30 seconds** using defaults.
- **95% or more** of default-setting exports pass all Production Check errors with no manual fix.
- **Zero** LightBurn import repairs needed on the QA corpus (dimensions within 0.1 mm).
- The Cake Topper Designer test suite passes unchanged.

---

# 13. Out of Scope for MVP (planned later)

- Cut-out name style (welded body with ring, no backing)
- Batch generation from a list of names, with sheet nesting
- Multi-line keychains
- Decorative shapes (hearts, stars) as backing or add-ons
- Double-hole or side-hole tags
- A fully client-side (WASM) geometry engine

---

# End of Document
