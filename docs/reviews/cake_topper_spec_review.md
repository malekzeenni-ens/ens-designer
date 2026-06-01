# Product Specification Review

## Local Cake Topper Web App

## 1. Executive Summary

**Overall readiness rating:** **Mostly Ready**  
**Product clarity rating:** **8/10**  
**UX usability rating:** **7/10**  
**Technical clarity rating:** **8/10**  
**Architecture confidence rating:** **8/10**  
**Export/cut-readiness confidence rating:** **6/10**

**Main conclusion:**  
The specification is strong as a **local maker-focused cake topper composition tool**. It clearly explains the business problem, multi-line workflow, per-line controls, font sizing, alignment, floating-dot handling, SVG/PNG export, backend pipeline, API model, and LightBurn-oriented output.

The biggest issue is not general architecture; it is the wording around **“laser-ready”**, **“connected piece”**, and **“overlap”**. The document explicitly says the system does **not** perform connectivity analysis, bridge generation, material validation, or structural scoring, and also notes that the canvas uses **flat path assembly with no boolean union**. That means the specification should not imply that the output is guaranteed to be a single welded, structurally validated cake topper without further checking.

The review should distinguish visual overlap from true vector welding/union and assess whether the result is practical for laser cutting, not just visually attractive.

---

## 2. What Is Strong

The specification is strong in these areas:

| Area | Strength |
|---|---|
| Product intent | The document clearly identifies the real workshop pain: creating lines separately in XCS, manually reducing spacing, stacking lines, aligning, exporting, and repeating the process inconsistently. |
| User workflow | The proposed workflow is practical: type phrase once, auto-split into lines, configure font/size/overlap/alignment per line, adjust vertical gaps, reposition floating components, export SVG. |
| Local app practicality | The solution remains correctly scoped as a local tool rather than a SaaS or multi-user platform. |
| Per-line controls | Independent font, size, alignment, gap controls, and floating component controls are well-defined. |
| Technical pipeline | The backend processing sequence is clearly documented: normalisation, HarfBuzz shaping, FontTools outline extraction, geometry model, gap measurement, pair shifts, path shifting, floating component handling, canvas assembly, SVG/PNG output. |
| API clarity | The request and response models are useful for coding-agent handoff. |
| Floating dot logic | The document correctly identifies the critical order: detect floating components before applying offsets, so controls remain available after the dot is moved. |
| Performance targets | Local generation timings are explicit and realistic for sequential processing. |
| Known limitations | The document openly lists no boolean union, no structural scoring, no material validation, and Cairo/Pillow preview limitations. |

---

## 3. Key Gaps and Risks

| Area | Gap / Risk | Severity | Why It Matters | Recommended Action |
| ---- | ---------- | -------: | -------------- | ------------------ |
| Cut readiness | The spec uses wording like “laser-ready SVG” and “one connected piece,” but also says no connectivity analysis, no structural scoring, and no boolean union. | **High** | A design may look connected but still import as separate paths or cut as disconnected pieces. | Reword export promise to “composition-ready SVG for LightBurn validation” unless boolean union/connectivity checks are added. |
| Welding / union | The spec confirms flat path assembly and no boolean union. | **High** | Visual overlap is not the same as a true welded vector shape. | Add a section called “Visual Overlap vs Boolean Union Behaviour.” |
| Validation | No disconnected-shape detection, thin-bridge warning, closed-counter warning, or minimum-feature warning. | **High** | Failed cuts waste acrylic and time. | Add minimum lightweight validation warnings without over-engineering. |
| UX precision | The spec is strong on accordion controls but weaker on canvas interaction such as zoom, pan, selected state, keyboard nudging, reset, and undo/redo. | **Medium** | Precise cake topper layout requires small positional adjustments. | Add low-risk UX controls: reset, preview scale, mm-based nudge buttons, undo/redo if already feasible. |
| Text splitting | `text.split()` makes every space-separated word a new line, capped at four words. | **Medium** | “Happy 1st Birthday Sarah” works, but “Baby Shower” or “Mr & Mrs Smith” may need grouped words per line. | Add manual line-break support using Enter/newline and keep auto-split as a quick mode. |
| LightBurn compatibility | LightBurn import is listed as manual validation, but no detailed import criteria are defined. | **Medium** | “Imports correctly” is too broad for QA. | Define exact LightBurn checks: dimensions, paths visible, no text dependency, counters preserved, no background, no unwanted strokes. |
| Font handling | Font catalogue is referenced but font licensing, unsupported fonts, and missing glyph handling are not detailed. | **Medium** | A chosen font may not support characters or may export incorrectly. | Add font error and unsupported glyph behaviour. |
| Local runtime | Backend module and endpoint are defined, but startup, ports, dependency installation, offline mode, and local file storage are not fully specified. | **Medium** | A coding agent or new developer may struggle to run/debug consistently. | Add “Local Runtime and Startup” section. |
| Security | Local risks such as path traversal, unsafe font files, and local server binding are not covered. | **Medium** | Font/file handling can still create local vulnerabilities. | Add practical local security controls. |
| Acceptance criteria | Current acceptance criteria are useful but mostly manual and not Given/When/Then. | **Medium** | QA may miss regression cases. | Expand into functional, UX, export, cut-readiness, and runtime acceptance criteria. |

---

## 4. Product Management Assessment

| Area | Assessment | Gaps | Recommended Refinements |
|---|---|---|---|
| Business/user problem | Strong. The manual XCS workflow is clearly described and directly tied to speed, consistency, and repeatability. | None significant. | Keep this as the opening business anchor. |
| Target user | Clear enough: laser business owner / maker. | Could specify that the user is likely non-technical and wants quick production output. | Add: “Primary user is a maker/operator preparing customer cake topper orders quickly.” |
| Workshop workflow | Strong for multi-line cake toppers. | It assumes each space equals a line. | Add support or future note for manual line breaks. |
| Feature scope | Clear and sensibly bounded. | “Laser-ready” conflicts with explicit exclusions. | Replace “laser-ready” with “LightBurn-ready composition SVG requiring final operator validation.” |
| User journey | Good: input → split → configure → preview → export. | Lacks explicit “review before cut” step. | Add a final “Pre-cut review checklist” in the UI or documentation. |
| Manual letter placement workflow | The spec covers per-gap controls rather than direct dragging of each letter. | The review prompt asks for manual manipulation of individual letter positions; the spec focuses on numeric per-gap controls. | Clarify whether this tab supports numeric gap-based manipulation only, not freeform drag. |
| Export expectations | SVG/PNG output is defined. | The degree of welding/union is ambiguous. | Add exact export guarantee: outlines are exported, but boolean union is not performed. |
| Edge cases | Some are covered, such as dots and 4-line cap. | Missing unsupported characters, long text, very small text, closed counters, failed font loading. | Add an edge-case table. |
| Success criteria | Existing criteria are helpful. | Needs physical production criteria. | Add “successful import into LightBurn at correct dimensions” and “operator confirms connected design before cutting.” |

**Suggested wording to add:**

> The Cake Topper tab produces a composed outline-based SVG intended for import into LightBurn. It visually overlaps letters and lines according to user-controlled spacing. In the current phase, the system does not guarantee a boolean-unioned single continuous path, does not perform structural validation, and does not certify the design as cut-ready without operator review.

---

## 5. UX and Canvas Interaction Review

| UX Area | Assessment | Recommended Improvement |
|---|---|---|
| Text input flow | Good for quick phrases. | Add manual line break support: each newline becomes a line; if no newline exists, auto-split by spaces. |
| Font selection | Good, assuming shared font catalogue works. | Show missing glyph warning if selected font cannot render a character. |
| Letter selection | Per-gap controls exist, but individual letter dragging is not specified. | Clarify whether direct letter selection/dragging is out of scope for this tab. |
| Dragging and positioning | Not clearly defined. | Add “no freeform dragging in Phase X” or define direct manipulation if intended. |
| Alignment and spacing | Strong: L/C/R/M and vertical gap values are clear. | Add quick reset buttons for per-line size, alignment, gap values, and floating offsets. |
| Zoom/pan | Not specified. | Add zoom-to-fit and 100% preview scale. Pan can be future unless preview area is cramped. |
| Undo/redo | Not specified. | Add at least “Reset last generated line settings” if full undo/redo is too much. |
| Visual feedback | Good accordion layout and sticky preview. | Add warnings directly under preview: “Visual overlap only — verify in LightBurn before cutting.” |
| Error states | Weak. | Add frontend error display for backend unavailable, font failed, export failed, unsupported characters. |
| Export flow | Clear buttons for SVG/PNG. | Add filename sanitisation and include design dimensions in export confirmation. |
| User confidence before cutting | Medium. | Add a pre-export checklist: dimensions, visual connection, counters visible, dot positions checked, LightBurn validation required. |

**Important UX note:**  
The UI is suitable for quick production use, but it currently reads more like a controlled generator than a true manual vector editor. That is fine, but the wording should be explicit so developers do not build unnecessary drag-and-drop complexity unless it is intentionally required.

---

## 6. Cake Topper Cut-Readiness Review

| Area | Assessment |
|---|---|
| One connected cuttable shape | Not proven. The spec allows overlapping letters and lines, but explicitly does not perform connectivity analysis. |
| Visual overlap vs true weld | This is the central ambiguity. The current implementation appears to create visual/path overlap, not boolean union. |
| Counters / holes | `fill-rule="nonzero"` is specified, which helps rendering, but there is no explicit validation that counters remain open after overlap. |
| Thin sections | Not checked. |
| Disconnected shapes | Not checked. |
| SVG laser readiness | The SVG is likely usable for LightBurn import, but not guaranteed to require no manual correction. |
| LightBurn import | Manual validation exists, but acceptance criteria need more detail. |

**Conclusion:**  
The specification does **not yet prove** that the app can produce a fully cut-ready, single-piece cake topper without external correction. It does show a credible path to producing a **LightBurn-compatible composition SVG**, but final cut-readiness still depends on operator review and/or LightBurn optimisation.

**Must-fix wording:**  
Do not describe the output as “laser-ready without manual vector editing” unless you either:

1. add boolean union/path welding, or  
2. explicitly define that LightBurn’s own optimise/weld workflow is part of the production process.

---

## 7. Technical Architecture Assessment

| Area | Assessment | Gaps | Recommended Refinements |
|---|---|---|---|
| Frontend responsibilities | Partially clear from UI spec. | Not explicitly separated from backend. | Add frontend responsibility list: input state, line configs, preview, download, error display. |
| Backend responsibilities | Strong. `CakeTopperService`, pipeline, geometry, SVG/PNG export are clear. | Error handling and logging not specified. | Add backend error contract. |
| API design | Good. Request/response models are helpful. | Needs validation constraints. | Add min/max values for font size, gap values, line count, string length. |
| State management | Basic request state is clear. | No history/undo, dirty state, persistence, or recovery. | Define whether projects are transient or saveable. |
| Font processing | Strong: HarfBuzz + FontTools + outline extraction. | Missing font licensing and unsupported glyph handling. | Add font validation and missing glyph response. |
| SVG generation | Good basic flow. | Needs unit/viewBox/export invariants. | Define SVG `width`, `height`, `viewBox`, units in mm, no background. |
| Path processing | Good for shifting and dot movement. | No boolean union. | Add explicit non-union limitation. |
| Export pipeline | Clear SVG + PNG. | Cairo/Pillow difference needs documentation. | Specify PNG is preview only and SVG is production output. |
| Local startup | Weak. | No install/start/port/offline process. | Add local runtime instructions. |
| Error handling | Weak. | No API error model. | Add standard JSON error response. |
| Logging | Not covered. | Debugging local issues may be hard. | Add lightweight local logs for generation/export failures. |
| Maintainability | Good foundation. | Needs module ownership and test coverage map. | Add developer handoff section with files touched and test commands. |

---

## 8. Data Model and Internal Logic Review

The API models are a good start. The request captures phrase text, default font, default size, overlap mode, per-line configs, and inter-line gaps. The response captures SVG, PNG, filenames, words, line metadata, gaps, dimensions, and floating components.

Recommended additions:

| Data Object | Add / Clarify |
|---|---|
| Project | `project_id`, `created_at`, `source_text`, `line_split_mode`, `version`. |
| Canvas | `width_mm`, `height_mm`, `padding_mm`, `viewBox`, `unit`. |
| Line | `line_index`, `raw_text`, `font_id`, `font_display_name`, `font_size_mm`, `alignment`, `alignment_offset_mm`, `bounds`. |
| Glyph / letter | `glyph_index`, `character`, `glyph_name`, `path_id`, `original_x_mm`, `current_x_mm`, `shift_mm`, `bounds`. |
| Gap | `left_glyph`, `right_glyph`, `enabled`, `requested_overlap_mm`, `actual_gap_before_mm`, `actual_gap_after_mm`. |
| Floating component | `component_id`, `parent_glyph`, `type`, `x_offset_mm`, `y_offset_mm`, `bounds_before`, `bounds_after`. |
| Export | `svg_units`, `viewBox`, `contains_text_elements=false`, `fill_rule`, `background_included=false`. |
| Validation | `warnings[]`, `errors[]`, `requires_operator_review=true`. |

Do **not** overbuild persistence yet. A transient local project model is enough, but the state should be clear enough for repeatable export and debugging.

---

## 9. Export and Laser Software Compatibility Review

| Export Area | Assessment | Recommendation |
|---|---|---|
| SVG structure | Basic combined SVG is defined. | Specify exact SVG root attributes: `xmlns`, `width="Xmm"`, `height="Ymm"`, `viewBox="0 0 X Y"`. |
| Units | mm is referenced in controls. | State that all output dimensions are mm and must import at the same size in LightBurn. |
| Scaling | Font scaling uses `font_size_mm / upem`. | Add acceptance criteria for exported dimensions matching metadata. |
| ViewBox | Not explicitly detailed. | Add explicit viewBox handling. |
| Text-to-path | Implied by FontTools outline extraction. | Explicitly state exported SVG contains paths, not `<text>` elements. |
| Path cleanliness | Not fully covered. | Add checks for closed paths and no invisible guide elements. |
| Fill/stroke | `fill-rule="nonzero"` is specified. | Add expected fill/stroke convention: black fill, no stroke, or define whichever the app uses. |
| PNG preview | CairoSVG primary, Pillow fallback. | State PNG is preview only, not production cutting output. |
| LightBurn import | Manual check exists. | Add detailed checklist: dimensions, counters, path visibility, no missing glyphs, no background rectangle. |
| Manual correction | Currently unclear. | Document whether LightBurn optimise/weld is expected or optional. |

**Recommended export wording:**

> SVG export must be outline-based and independent of installed fonts. It must not contain editable `<text>` elements. It must use millimetre dimensions and a matching viewBox so that LightBurn imports the design at the expected physical size. PNG export is for visual preview only and must not be treated as the production cutting file.

---

## 10. Security and Local Runtime Review

This is a local app, so security should be practical, not SaaS-heavy.

| Area | Assessment | Recommended Control |
|---|---|---|
| Local server exposure | Not specified. | Bind to `127.0.0.1` by default, not `0.0.0.0`. |
| File handling | Export flow exists but storage not detailed. | Sanitize filenames and restrict writes to a known export/temp directory. |
| Font uploads | Font catalogue referenced, but upload handling not specified. | Accept only expected font types, validate file extension and MIME where possible. |
| File path safety | Not specified. | Block `../` traversal and absolute path reads from user input. |
| Input sanitisation | Text input exists but constraints are basic. | Add max length, allowed character guidance, and unsupported glyph warnings. |
| Dependency risks | HarfBuzz, FontTools, CairoSVG, Pillow are implied. | Add dependency version lock and setup instructions. |
| Offline capability | Local app concept implies offline use. | Explicitly state no internet is required after dependencies/fonts are installed. |
| External calls | Not mentioned. | State that the app must not make external network calls during generation/export. |

---

## 11. Error Handling and Resilience Review

| Failure Scenario | Current Spec Coverage | Risk | Recommended Behaviour |
| ---------------- | --------------------- | ---- | --------------------- |
| Backend server unavailable | Not covered | User sees broken UI or silent failure | Show “Backend is not running. Start the local server and retry.” |
| Font cannot load | Not covered | Empty/malformed output | Show line-level error and block export. |
| Invalid text input | Partially covered by max 4 words | Unexpected layout or crash | Validate empty input, >4 lines, excessive length, unsupported characters. |
| Export fails | Not covered | User cannot download or gets corrupt file | Show clear export error and preserve current state. |
| SVG generation fails | Not covered | Broken download | Return structured API error with cause and request ID/log reference. |
| Browser refresh | Not covered | Work may be lost | Either persist last state in local storage or clearly warn unsaved state will reset. |
| State loss | Not covered | Rework required | Add optional “restore last design” from local storage. |
| Unsupported character | Not covered | Missing glyphs or wrong shapes | Detect missing glyphs and show affected character/font. |
| File write error | Not covered | Export appears successful but file unavailable | Keep browser download-based export or show write permission error. |
| Imported font produces bad path data | Not covered | Broken SVG path/counter output | Catch path extraction errors; mark font as incompatible for that text. |

---

## 12. Testing and Acceptance Criteria Review

The current acceptance criteria are useful but too manual-heavy. They should be expanded into Given/When/Then criteria.

### Functional Acceptance Criteria

- **Given** the user enters “Happy Birthday”, **when** they generate a topper, **then** the app creates two lines: “Happy” and “Birthday”.
- **Given** the user changes Line 1 font, **when** the preview regenerates, **then** Line 2 font remains unchanged.
- **Given** the user sets Line 2 size to 60mm, **when** the preview regenerates, **then** Line 2 is visibly larger and metadata reports the correct dimensions.
- **Given** the user applies a negative vertical gap, **when** the preview regenerates, **then** the lower line moves upward into the previous line.

### UX Acceptance Criteria

- **Given** a generated design, **when** a line accordion is collapsed, **then** the header shows line text, font, size, alignment, gap count, and dimensions.
- **Given** a floating dot is detected, **when** the user moves it toward the stroke, **then** the dot controls remain visible.
- **Given** manual alignment is selected, **when** the user enters an X offset, **then** the line moves horizontally by the expected mm value.

### Export Acceptance Criteria

- **Given** a generated design, **when** the user downloads SVG, **then** the SVG contains path outlines and no editable `<text>` elements.
- **Given** a generated design, **when** the SVG is imported into LightBurn, **then** the imported dimensions match the metadata within an agreed tolerance.
- **Given** a generated design, **when** PNG is downloaded, **then** it visually matches the SVG preview and is clearly labelled as preview only.

### Cut-Readiness Acceptance Criteria

- **Given** letters are visually overlapped, **when** the SVG is exported, **then** the specification must state whether those paths are boolean-unioned or visually overlapped only.
- **Given** a design contains `a`, `e`, `o`, `b`, `d`, `p`, `0`, `6`, `8`, or `9`, **when** exported, **then** counters must remain visible in preview and LightBurn import.
- **Given** floating components exist, **when** they are moved to connect with the main stroke, **then** the preview reflects the intended connection and the user is warned that structural validation is not automated.

### Local Runtime Acceptance Criteria

- **Given** the backend is not running, **when** the frontend calls `/api/cake-topper`, **then** the user sees a clear backend unavailable message.
- **Given** all dependencies are installed, **when** the user starts the app locally, **then** the frontend and backend run without internet access.
- **Given** an export fails, **when** the user retries after fixing the issue, **then** the previous design state is preserved.

---

## 13. Suggested Test Matrix

| Test Area | Scenario | Expected Result | Priority |
| --------- | -------- | --------------- | -------- |
| Script fonts | Generate “Happy Birthday” using a connected script font | Smooth script outlines, counters preserved, no missing glyphs | P0 |
| Non-script fonts | Generate “Sarah” using bold block font with overlap | Letters visually overlap as configured | P0 |
| Short names | Generate “Mia” | Correct layout, no excessive canvas padding | P1 |
| Long names | Generate “Alexandria Birthday Celebration” | Handles max line limit gracefully or warns | P0 |
| Letters with counters | Test `a e o b d p` | Inner holes remain visible in preview and LightBurn | P0 |
| Numbers with counters | Test `0 6 8 9` | Counters remain visible and not filled incorrectly | P0 |
| Manual letter overlap | Adjust per-gap values | Gaps update correctly and preview regenerates | P0 |
| Vertical overlap | Set negative inter-line gap | Lines move closer/overlap vertically | P0 |
| Floating dot | Test words with `i` and `j` | Floating controls appear and remain available after movement | P0 |
| Export to SVG | Download production SVG | Contains paths, correct mm dimensions, no text dependency | P0 |
| Export to PNG | Download preview PNG | Visual match to SVG preview | P1 |
| Import into LightBurn | Import SVG | Correct dimensions, visible paths, counters preserved | P0 |
| Backend startup | Start backend locally | `/api/cake-topper` available | P0 |
| Backend failure | Stop backend and use UI | Clear error message shown | P0 |
| Font loading failure | Use missing/corrupt font | Clear font error, export blocked | P0 |
| Unsupported characters | Use emoji or unsupported glyph | User warned with exact unsupported character | P1 |
| Cairo missing | Run without CairoSVG dependency | Pillow fallback works or user gets setup instruction | P1 |
| Alignment controls | Test L/C/R/M | Each alignment behaves as specified | P0 |
| Manual X offset | Apply +12.5mm offset | Line moves by expected amount | P1 |
| Performance | Generate 4-line design | Completes within target timing | P1 |

---

## 14. Recommended Specification Enhancements

| Section to Add / Improve | Why It Is Needed | Suggested Content |
| ------------------------ | ---------------- | ----------------- |
| Visual Overlap vs Boolean Union | Prevents misunderstanding about cut-readiness | State that Phase X uses flat path assembly and does not boolean-union paths. |
| Export Contract | Makes LightBurn output testable | Define SVG units, viewBox, paths-only export, no background, no text elements. |
| Cut-Readiness Disclaimer | Protects against failed material cuts | State that operator review is required unless validation is added. |
| Local Runtime Setup | Improves developer/coding-agent handoff | Backend start command, frontend start command, ports, dependencies, offline behaviour. |
| Error Handling Contract | Prevents silent failures | Standard API error shape and frontend messages. |
| Font Handling Rules | Avoids bad exports | Supported formats, font catalogue rules, missing glyph handling, licensing note. |
| Validation Warnings | Reduces failed cuts | Required now: missing glyphs, too many lines, export failure, dimensions. Future: connectivity, thin bridges, material checks. |
| LightBurn QA Checklist | Makes manual validation consistent | Import size, counters, visible paths, no text dependency, no background. |
| Data Model Details | Improves maintainability | Project, line, glyph, gap, floating component, export, warning models. |
| Acceptance Criteria Expansion | Makes QA executable | Given/When/Then by functional, UX, export, cut-readiness, runtime. |

---

## 15. Recommended Implementation Phases

## Phase 1: Specification Clarification and Low-Risk UX Improvements

**Objective**  
Make the specification internally consistent and safer for developer handoff without changing the existing working engine.

**Scope**
- Reword “laser-ready” claims.
- Add “Visual Overlap vs Boolean Union” section.
- Add export contract.
- Add local runtime section.
- Add basic frontend error messages.
- Add reset controls for line settings if low-risk.
- Add LightBurn validation checklist.

**Expected outcome**  
The document clearly states what the app does and does not guarantee.

**Developer notes**
- Do not change geometry behaviour.
- Do not add boolean union in this phase.
- Do not alter Phase X overlap engine unless required for bug fixes.

**QA notes**
- Regression test current working examples.
- Confirm existing SVG output still imports into LightBurn.

**Documentation updates required**
- Update feature spec.
- Update handoff docs.
- Add local startup notes.
- Add export contract.

**Risk of breaking existing behaviour**  
Low.

---

## Phase 2: Export, Validation, and Cut-Readiness Improvements

**Objective**  
Improve production confidence without over-engineering.

**Scope**
- Add missing glyph detection.
- Add export invariant checks.
- Add warnings for visual overlap only.
- Add LightBurn import test checklist.
- Add optional disconnected-shape warning if simple to implement.
- Clarify whether LightBurn optimise/weld is part of workflow.

**Expected outcome**  
User has clearer confidence before cutting and fewer failed exports.

**Developer notes**
- Prioritise detection/warnings over automated fixes.
- Avoid structural scoring unless separately approved.
- Keep current app behaviour stable.

**QA notes**
- Test counters, floating dots, dimensions, unsupported characters.
- Validate SVG in LightBurn.

**Documentation updates required**
- Add validation warning catalogue.
- Add QA matrix.
- Add export examples.

**Risk of breaking existing behaviour**  
Medium if export pipeline is touched; low if only warnings are added.

---

## Phase 3: Internal Architecture and Maintainability Improvements

**Objective**  
Make the app easier to maintain, debug, and extend.

**Scope**
- Add structured API error responses.
- Add local logging.
- Add dependency/version documentation.
- Add module responsibility map.
- Add test coverage map.
- Add request/response examples.

**Expected outcome**  
Future coding agents can safely modify the app without losing context.

**Developer notes**
- Keep modules small.
- Do not combine UI, geometry, export, and validation concerns.
- Preserve existing `CakeTopperService` abstraction.

**QA notes**
- Add unit tests for request validation and path generation.
- Add integration tests for `/api/cake-topper`.

**Documentation updates required**
- Architecture overview.
- API reference.
- Testing guide.
- Handoff document.

**Risk of breaking existing behaviour**  
Low to medium depending on refactoring depth.

---

## Phase 4: Optional Future Enhancements

**Objective**  
Enhance production capability once the current local generator is stable.

**Scope**
- Boolean union/welding.
- Connectivity analysis.
- Minimum bridge/feature thickness warnings.
- Stake geometry.
- Material-aware recommendations.
- Manual line-break mode.
- Preset compositions.
- LightBurn layer assignment.

**Expected outcome**  
The app becomes closer to a true production-grade cake topper generator rather than a composition/export assistant.

**Developer notes**
- Treat boolean union and structural validation as separate design decisions.
- Validate with real LightBurn imports and test cuts.

**QA notes**
- Run physical cut tests on 3mm acrylic and wood.

**Documentation updates required**
- New phase spec.
- Structural validation rules.
- Test cut log.

**Risk of breaking existing behaviour**  
Medium to high, especially for boolean union and path processing.

---

## 16. Impact Assessment

| Recommendation | Product Impact | Technical Impact | Risk of Breaking Existing Behaviour | Priority |
| -------------- | -------------- | ---------------- | ----------------------------------- | -------- |
| Clarify visual overlap vs boolean union | High | Low | Low | Must do |
| Reword “laser-ready” promise | High | Low | Low | Must do |
| Add export contract | High | Medium | Low | Must do |
| Add LightBurn validation checklist | High | Low | Low | Must do |
| Add missing glyph/font error handling | Medium | Medium | Low | Should do |
| Add local startup/runtime documentation | Medium | Low | Low | Should do |
| Add structured API error responses | Medium | Medium | Low | Should do |
| Add basic validation warnings | High | Medium | Low/Medium | Should do |
| Add undo/redo | Medium | Medium | Medium | Could do |
| Add manual line-break support | Medium | Medium | Medium | Could do |
| Add boolean union/welding | Very high | High | High | Defer |
| Add material-aware structural scoring | High | High | Medium/High | Defer |
| Add automatic stake geometry | High | Medium/High | Medium | Defer |

---

## 17. Final Recommendation

The specification is **mostly ready for formal Phase 2 documentation**, but it should not yet be called fully production-ready from a cut-readiness perspective.

**What must be clarified first**
- Whether the SVG is intended to be truly welded/boolean-unioned or visually overlapped only.
- Whether LightBurn optimisation/manual verification is part of the expected workflow.
- What “laser-ready” means in this phase.
- What exact checks prove the SVG imports correctly into LightBurn.

**What can be improved later**
- Boolean union/welding.
- Connectivity analysis.
- Minimum bridge thickness validation.
- Material-aware scoring.
- Auto stake generation.
- Preset topper layouts.

**Architecture suitability**  
The local web app + backend architecture is appropriate. The backend pipeline is well-defined and sensible for font shaping, path extraction, geometry processing, SVG assembly, and PNG preview generation.

**UX suitability**  
The UX is strong for a controlled generator workflow. It may not fully meet the broader “manual letter manipulation” concept unless that is intentionally limited to numeric gap/offset controls rather than drag-and-drop editing.

**Export reliability**  
Export is promising but needs a stricter contract. The SVG should be documented as outline-based, mm-based, LightBurn-compatible, and independent of installed fonts. PNG should remain preview-only.

**Likelihood of producing laser-cuttable files**  
The app is likely to produce useful cake topper SVGs for an experienced operator, especially if checked in LightBurn. However, because the spec excludes connectivity analysis, bridge generation, material validation, structural scoring, and boolean union, it should not claim guaranteed single-piece cut-readiness without operator review.

**Developer / coding-agent handoff**  
The document is already strong enough for a coding agent to understand the feature, but it needs additional guardrails around export behaviour, validation limits, local runtime setup, and error handling before further implementation work proceeds.
