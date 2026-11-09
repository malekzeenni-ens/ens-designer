# KEYCHAIN_DESIGNER_IMPLEMENTATION_PLAN.md

## Phase Information

Phase Number: K (Keychain Designer). Independent of the Phase 2–6 roadmap.
Phase Name: Dedicated Keychain Designer Tab
Target Release: next minor version after the current tag (run `git tag --sort=-v:refname | head -1`)
Owner: Etch 'N' Shine
Date: 2026-11-06
Status: K0 complete on 2026-11-09. K1 is next; see `docs/handoffs/keychain-designer-k0-baseline-handoff.md` for timings, tests and environment notes. Report at the milestone boundary before K1.

Companion document (read first): `docs/phases/KEYCHAIN_DESIGNER_USER_JOURNEY.md`. Stage, check and default references below (for example "Journey §7 Stage 6") point into it.

---

# 0. Instructions to the Coding Agent

1. Follow `docs/governance/CODING_AGENT_MASTER_PROMPT.md`: review, plan, present, wait for approval, implement only the approved scope, test, document, hand off, commit.
2. Deliver in the milestone order in §6. **Every milestone must leave the app working and all existing tests green.** Stop and report at the end of each milestone.
3. **Hard constraint:** the Cake Topper Designer must behave byte-for-byte the same.
   - Any shared-code change is behaviour-neutral and covered by the existing `tests/test_cake_topper.py`.
   - Before milestone K1, export SVGs for the three golden recipes in §9.3 and keep them as fixtures. They must be identical after K1.
4. **Environment check first.** During analysis on 2026-11-06, `.venv313\Scripts\python.exe` hung on importing Shapely (timed out after 90 s). Confirm `python -c "import shapely, uharfbuzz, fontTools"` completes before starting. If it hangs, report it; do not work around it silently.
5. Do not edit `docs/governance/*`. Update the README, phase index, deployment log and handoffs as listed in §10.
6. Commit style: Conventional Commits, as in the existing git history.

---

# 1. Executive Summary

**What:** a new **Keychain** workspace tab that turns a name into a production-ready keychain SVG (backing, ring/keyhole, name layer) with a live preview. It has its own backend engine and API and reuses the existing shaping, outline, overlap, floating-component and ring logic.

**Why:**
- Today keychains are made inside the Cake Topper Designer by enabling outline and ring. It works, but it is slow to iterate: every change is a full round trip that includes a PNG render.
- It is not keychain-shaped: there is no finished-size control, the backing keeps counter holes, the ring is not auto-snapped, dots are not auto-joined, and text and backing default to the same layer colour.
- A reverse-engineering review of vectorsfile.com showed a much smoother keychain workflow but weaker geometry (see Journey §2).

**Outcome:** a typical name goes from opening the tab to a LightBurn-ready SVG in under 30 seconds, with higher-quality geometry than both today's workaround and the reference tool.

---

# 2. Scope

## 2.1 Included

1. New workspace tab **Keychain** (frontend feature module).
2. New backend `KeychainService`, request/response models and routes:
   - `POST /api/keychain/preview`: fast, no PNG
   - `POST /api/keychain/export`: full SVG(s) and PNG
   - `GET` / `POST /api/keychain/history`
3. Geometry features:
   - Solid backing (fill counters)
   - Outline smoothing (closing)
   - Uniform finished-size solver (width or height)
   - Ring auto-snap with minimum neck
   - i/j dot auto-join
   - Per-glyph transforms (dx, dy, scale, rotation)
   - Adaptive Bézier flattening
4. Two styles: **Engraved** and **Layered**, with LightBurn-friendly layer groups and colours.
5. Production Check (validation with fix actions), described in §5.6.
6. Performance work:
   - Parsed-font cache (benefits all engines)
   - Preview/export split
   - Debounced, cancellable, ordered requests on the frontend
7. Undo/redo (100 steps), presets, "Next name", keychain history and recipe embedding.
8. Units display (mm/cm/inch); all API values stay in mm.
9. Tests (unit, integration, frontend), benchmark script, QA matrix, LightBurn validation, documentation.

## 2.2 Excluded

- Cut-out name style (welded, no backing): future milestone K6 (see §13)
- Batch names and sheet nesting
- Multi-line keychains
- Decorative backing shapes
- A client-side WASM geometry engine
- Any change to Cake Topper UI or behaviour
- Removing keychain-like usage (outline + ring) from the Cake Topper; it stays as it is

---

# 3. Requirements Mapping

| ID | Requirement | Journey ref | Milestone |
|---|---|---|---|
| KC-FR-01 | Keychain workspace tab with preserved state | §7 Stage 0 | K3 |
| KC-FR-02 | Live preview from typing, never blank | §7 Stage 1, §9 | K3 |
| KC-FR-03 | Missing-glyph warnings and a "fonts that support this name" filter | Stage 1, 3 | K2/K3 |
| KC-FR-04 | Styles: Engraved, Layered | §5, Stage 2 | K2/K3 |
| KC-FR-05 | Visual font picker with keychain suitability badge | Stage 3 | K3 |
| KC-FR-06 | Finished-size target (width/height), uniform scaling, ±0.05 mm | Stage 4 | K2 |
| KC-FR-07 | Backing offset, fill counters, smoothing, stroke buffer | Stage 5 | K2 |
| KC-FR-08 | Ring: positions, sizes, drag, auto-snap, nudge | Stage 6 | K2/K3 |
| KC-FR-09 | Overlap modes and per-gap overlap | Stage 7 | K2/K3 |
| KC-FR-10 | Dot auto-join (10–50%, default 25%) + manual dot offsets | Stage 7 | K2 |
| KC-FR-11 | Letter Inspector: per-glyph dx/dy/scale/rotate, cluster-based selection | Stage 7 | K4 |
| KC-FR-12 | Production Check with fix actions and highlight | Stage 8 | K2/K5 |
| KC-FR-13 | Export: valid SVG, mm units, fitted canvas, named groups, layer colours, Bézier text, recipe | Stage 9 | K2 |
| KC-FR-14 | Layered export: one combined SVG or two files | Stage 9 | K2/K3 |
| KC-FR-15 | PNG mock-up export | Stage 9 | K2 |
| KC-FR-16 | Undo/redo with keyboard shortcuts | Stage 10 | K4 |
| KC-FR-17 | Next name; keychain history and reload | Stage 10 | K4 |
| KC-FR-18 | Presets (Name Keychain, Mini Charm, Bag Tag) | §8 | K3 |
| KC-FR-19 | Units display mm/cm/inch | Stage 4 | K3 |
| KC-NFR-01 | Performance budgets in Journey §11 | §11 | K1–K5 |
| KC-NFR-02 | Cake Topper output unchanged | — | All |
| KC-NFR-03 | Accessibility requirements | §10 | K3–K5 |
| KC-NFR-04 | No silent failures; all errors surfaced | §4 | All |

---

# 4. Architecture Decisions

## AD-1: The backend stays the single geometry engine; speed comes from caching and the preview/export split, not a browser engine

- **Rejected alternative:** port the engine to the browser (opentype.js + ClipperLib or harfbuzzjs WASM), as vectorsfile.com does.
- **Why rejected:** it would duplicate the shaping, overlap, floating, ring and validation logic in TypeScript, create two sources of truth for production geometry, and weaken HarfBuzz/Shapely fidelity.
- **Revisit** only if K1 benchmarks cannot meet the Journey §11 budget. Record that decision as a new ADR.

## AD-2: New engine module; reuse, don't fork

`keychain_engine.py` composes the existing modules:
- `text_shaper`
- `outline_extractor`
- `canonical_geometry`
- `overlap_helpers`
- `floating_component`
- `shapely_converter`
- the ring helpers, after extraction (AD-3)

It must not copy-paste these.

## AD-3: Extract the ring and compound-path helpers into a shared module, with no behaviour change

Move these from `cake_topper_engine.py` into `backend/app/ring_geometry.py`:
- `_apply_ring_to_base` core math
- `_approximate_ring_neck_width`
- `_ring_validation_warnings`
- `_compound_paths_from_shapely`
- `_append_ring_commands`
- `_paths_union`
- `_buffer_line_paths`

Rules:
- `cake_topper_engine.py` imports them back under the same private names (thin aliases) so its call sites and tests are untouched.
- Positions stay as they are for the Cake Topper. The new positions (`left-middle`, `right-middle`) are keychain-only and live in the keychain engine.

## AD-4: Keychain models are additive

- Add the new Pydantic models in `models.py` under a `# --- Keychain ---` section, following the existing convention.
- No existing model fields change.

## AD-5: The frontend is a feature module

- Mirror `frontend/src/features/sizing-assistant/` as `frontend/src/features/keychain/`.
- Do **not** modify `CakeTopperPanel.tsx` or `PreviewPanel.tsx`. The keychain preview reuses their drag *technique* (direct DOM transform during drag, commit on pointer-up) in its own component.
- Reuse `FontPicker` as is.

## AD-6: Uniform scaling only

Never scale X and Y separately (vectorsfile weakness W2). Ring and hole sizes are physical and never scaled.

---

# 5. Technical Approach

## 5.1 Font cache (milestone K1, shared, behaviour-neutral)

**Problem:** every request re-reads font bytes and builds `hb.Face`/`hb.Font` in `shape_text` ([text_shaper.py](../../backend/app/text_shaper.py)), then opens `TTFont` twice (shaper plus `extract_outlines`). There is no parsed-font cache. `font_loader.py` caches only names.

**Design:** new `backend/app/font_cache.py`.

```python
@dataclass(frozen=True)
class LoadedFont:
    path: Path
    data: bytes
    hb_face: hb.Face
    hb_font: hb.Font      # scale = (upem, upem), ot funcs set
    tt_font: TTFont       # lazy=False, opened once
    glyph_set: Any        # tt_font.getGlyphSet()
    upem: float
    lock: threading.RLock # TTFont/glyph_set are not thread-safe

def get_loaded_font(path: Path) -> LoadedFont: ...
# LRU keyed by (resolved path, st_mtime_ns, st_size); maxsize 32; module-level lock for inserts.
def clear_font_cache() -> None: ...  # for tests and font upload/delete routes
```

Changes to existing modules:
- `shape_text(text, font_path, loaded: LoadedFont | None = None)`: when `loaded` is given, use the cached HarfBuzz objects; otherwise keep today's code path unchanged.
- `extract_outlines(..., loaded: LoadedFont | None = None)`: same pattern. Hold `loaded.lock` while drawing glyphs.
- FastAPI runs sync routes in a thread pool, so all access to `tt_font`/`glyph_set` must be under `loaded.lock`. HarfBuzz shaping with a shared `hb.Font` must also be under the lock (do not assume thread safety).
- Call `clear_font_cache()` from the font upload and delete routes in `api/routes/fonts.py`.
- **The Cake Topper does not have to adopt the cache in this phase.** Adoption is optional and allowed only if the golden-file comparison stays identical. Recommended: adopt it, because it is pure speed.

Also in K1, add a glyph outline cache in the keychain engine: an LRU keyed by `(font key, glyph_name)` that stores raw font-unit `PathCommand` lists. Positioning and scaling are applied afterwards, so this is safe.

## 5.2 Keychain request and response models (K2)

Add to `backend/app/models.py`:

```python
KeychainStyle = Literal["engraved", "layered"]
KeychainSizeMode = Literal["width", "height"]
KeychainRingPosition = Literal["top-left", "top-center", "top-right", "left-middle", "right-middle", "custom"]
KeychainQuality = Literal["preview", "export"]

class KeychainGlyphTransform(BaseModel):
    glyph_index: int = Field(ge=0)
    dx_mm: float = Field(default=0.0, ge=-50, le=50)
    dy_mm: float = Field(default=0.0, ge=-50, le=50)
    scale: float = Field(default=1.0, ge=0.5, le=2.0)
    rotation_deg: float = Field(default=0.0, ge=-45, le=45)

class KeychainSizeConfig(BaseModel):
    mode: KeychainSizeMode = "width"
    target_mm: float = Field(default=60.0, ge=10.0, le=200.0)   # width 25–200 / height 10–100 enforced in validator

class KeychainBackingConfig(BaseModel):
    offset_mm: float = Field(default=3.0, ge=1.0, le=10.0)
    fill_counters: bool = True
    smoothing_mm: float = Field(default=0.5, ge=0.0, le=3.0)

class KeychainRingConfig(BaseModel):
    enabled: bool = True
    position: KeychainRingPosition = "top-left"
    outer_diameter_mm: float = Field(default=12.0, ge=10.0, le=15.0)
    hole_diameter_mm: float = Field(default=5.0, ge=4.0, le=6.0)
    x_offset_mm: float = Field(default=0.0, ge=-100, le=100)
    y_offset_mm: float = Field(default=0.0, ge=-100, le=100)
    auto_snap: bool = True
    min_wall_thickness_mm: float = 3.0     # same values as CakeTopperRingConfig
    min_neck_width_mm: float = 5.0

class KeychainDotConfig(BaseModel):
    auto_join: bool = True
    overlap_pct: float = Field(default=25.0, ge=10.0, le=50.0)
    manual_offsets: list[FloatingComponentOffset] = Field(default_factory=list)

class KeychainLayerColors(BaseModel):
    backing: str = Field(default="#000000", pattern=HEX_COLOR_PATTERN)
    text: str = Field(default="#FF0000", pattern=HEX_COLOR_PATTERN)

class KeychainRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40)
    font_id: str
    style: KeychainStyle = "engraved"
    material_id: str = "cast-acrylic-3mm"
    size: KeychainSizeConfig = Field(default_factory=KeychainSizeConfig)
    overlap_mode: Literal["auto", "light", "medium", "strong", "custom"] = "auto"
    overlap_custom_mm: float | None = Field(default=None, gt=0, le=10.0)
    gap_configs: list[OverlapGapConfig] = Field(default_factory=list)
    letter_spacing_mm: float = Field(default=0.0, ge=-10, le=20)   # applied at reference size before solve
    glyph_transforms: list[KeychainGlyphTransform] = Field(default_factory=list)
    dots: KeychainDotConfig = Field(default_factory=KeychainDotConfig)
    stroke_buffer_mm: float = Field(default=0.0, ge=0.0, le=0.6)
    backing: KeychainBackingConfig = Field(default_factory=KeychainBackingConfig)
    ring: KeychainRingConfig = Field(default_factory=KeychainRingConfig)
    colors: KeychainLayerColors = Field(default_factory=KeychainLayerColors)
    layered_export: Literal["combined", "separate"] = "combined"
    quality: KeychainQuality = "preview"
    request_id: int | None = None   # echoed back; frontend uses it for ordering
```

Response models:

```python
class KeychainGlyphInfo(BaseModel):          # for Letter Inspector hit-testing
    glyph_index: int
    cluster_text: str                        # characters covered by this glyph cluster
    bbox_mm: tuple[float, float, float, float]  # in final SVG coordinates
    has_floating_component: bool

class KeychainCheck(BaseModel):
    id: str                                  # e.g. "KC-BACKING-SINGLE-PIECE"
    severity: Literal["error", "warning", "info", "pass"]
    message: str
    fix: dict | None = None                  # e.g. {"action": "set", "field": "backing.offset_mm", "value": 4.2}
    highlight_bbox_mm: tuple[float, float, float, float] | None = None

class KeychainFile(BaseModel):
    filename: str
    svg: str

class KeychainResponse(BaseModel):
    request_id: int | None
    preview_svg: str                         # always present; combined view with all layers
    files: list[KeychainFile] = []           # export only
    png_base64: str | None = None            # export only
    width_mm: float
    height_mm: float
    scale_applied: float                     # uniform text scale relative to reference size
    size_solve_converged: bool
    glyphs: list[KeychainGlyphInfo]
    ring: KeychainRingMetadata | None        # center, sizes, wall, neck, snapped: bool
    checks: list[KeychainCheck]
    recipe: dict                             # the normalised request + app version
    timings_ms: dict[str, float]             # per stage; logged; shown only in dev
```

## 5.3 Geometry pipeline (`backend/app/keychain_engine.py`, K2)

All internal units are mm and use the SVG y-down convention, the same as today.

```text
 1. normalise_text(text)
 2. loaded = get_loaded_font(font_path); shaped = shape_text(..., loaded=loaded)
 3. glyphs, paths = extract_outlines(..., font_size_mm=REFERENCE_SIZE_MM=100.0, loaded=loaded)
    • missing glyphs (.notdef) → KC-MISSING-GLYPHS warning (reuse cake topper logic)
 4. Spacing + overlap at reference size:
    • letter_spacing_mm (divide by expected scale; see note N1)
    • _bbox_gaps / _pair_shifts / _cumulative / _shift_paths (overlap_helpers)
 5. Floating components:
    • detect_floating_components(...) BEFORE any offsets (same rule as cake topper)
    • if dots.auto_join: join_floating_components(paths, glyphs, overlap_pct)  (NEW, §5.4)
    • then apply_floating_offsets(manual_offsets)  (existing)
 6. Per-glyph transforms (NEW): for each KeychainGlyphTransform, scale/rotate the glyph's
    paths about its bbox centre, then translate (dx, dy converted to reference units, N1).
    Implement on PathCommand control points (affine maps keep Bézier curves exact).
 7. Text geometry: text_geom = union(path_to_shapely(p, tolerance_mm=...)) (adaptive flattening, §5.5)
    • stroke_buffer_mm > 0 → buffer text (reuse _buffer_line_paths via ring_geometry)
 8. Size solve (§5.4) → scale s, backing geometry, ring placement
 9. Ring: union tab, subtract hole (shared ring_geometry), auto-snap (§5.4)
10. Validation (§5.6)
11. Output:
    • text paths: original PathCommands transformed by s (Bézier preserved)
    • backing: compound paths via _compound_paths_from_shapely
    • fitted canvas: bounds + 2 mm margin; translate everything to positive coordinates
    • SVG assembly (§5.7)
    • export only: PNG via the existing _render_png (cairosvg → Pillow fallback)
```

**N1 (units):** dx/dy and spacing are given in *final* mm. Convert them to reference units with the scale from the previous successful solve. If none exists, use a provisional solve that ignores transforms, then re-apply them. Document this in code. The tests in §9.1 cover it.

## 5.4 New geometry algorithms

### A. Solid backing

```python
def fill_counters(geom):
    polys = geom.geoms if MultiPolygon else [geom]
    return unary_union([Polygon(p.exterior) for p in polys])
```

Applied when `backing.fill_counters` is true. The keyhole is subtracted **after** this, so it is unaffected.

### B. Outline smoothing (morphological closing)

```python
backing = text_s.buffer(offset + k, join_style="round", quad_segs=16).buffer(-k, join_style="round", quad_segs=16)
```

Here `k = smoothing_mm`. This fills narrow notches and slivers between letters without moving the outer offset distance. The offset stays exactly `offset_mm` on convex parts.

### C. Uniform size solver

Let `F(s)` = the finished outer width (or height) after scaling the text by `s`, buffering, smoothing, filling and attaching the ring.

1. Initial guess: `s0 = (target − 2·offset − ring_extra_estimate) / text_width_ref`, where `ring_extra_estimate` comes from the ring position.
2. Secant iteration on `F(s) − target`, at most 6 iterations, tolerance 0.05 mm. `F` is monotone increasing in `s`; guard it with bisection bounds `[s_min, s_max]`.
3. If the minimum achievable size is above the target (ring + offset dominate), return the minimum, set `size_solve_converged=False` and raise the `KC-SIZE-MIN` error with a fix `{"action":"set","field":"size.target_mm","value":<min>}`.
4. **Performance:** in each iteration, scale the *already-unioned* reference text geometry with `shapely.affinity.scale(text_geom, s, s, origin=(0,0))`. Do not re-flatten. Only buffering repeats.

### D. Ring auto-snap

1. Compute the nominal centre from the position:

   | Position | Centre |
   |---|---|
   | top-left | `(min_x + R, min_y + overlap − R)` |
   | top-center | `(mid_x, min_y + overlap − R)` |
   | top-right | `(max_x − R, min_y + overlap − R)` |
   | left-middle | `(min_x + overlap − R, mid_y)` |
   | right-middle | `(max_x − overlap + R, mid_y)` |
   | custom | `top-left` + offsets |

   Then add `x_offset_mm` / `y_offset_mm`. Use the same overlap default as the Cake Topper ring (5 mm).
2. If `auto_snap`: find the nearest point `P` on `backing.exterior` to the centre `C` (`shapely.ops.nearest_points`). Move `C` along `P→C` so that `distance(C, backing) = R − required_overlap`, where `required_overlap` gives a neck width ≥ `min_neck_width_mm` (invert `_approximate_ring_neck_width`). Report `ring.snapped=True` when the centre moved by more than 0.05 mm.
3. Union the tab, subtract the hole, run the existing checks (wall, neck, hole-text proximity).

### E. Dot auto-join

New function `join_floating_components()` in `floating_component.py`. It is additive; existing functions do not change.

- For each glyph with a detected floating subpath (dot above the stem), translate the dot vertically so it overlaps the main body by `overlap_pct` of the dot height. This is the vectorsfile rule, implemented on our subpath model.
- Only move dots that sit above the body (y-down: `dot.max_y ≤ main.min_y`). Leave accents below and other diacritics untouched in the MVP.
- Manual dot offsets are applied **after** the auto-join, so the user can always override it.

### F. Per-glyph transforms

Apply the affine transform to every control point of the glyph's `PathCommand`s about the glyph bbox centre. Rotation and uniform scale keep winding. No flip is offered (see Journey Stage 7).

## 5.5 Adaptive flattening

`path_to_shapely` currently uses fixed 8 (quadratic) and 12 (cubic) steps. At the 100 mm reference size and an export scale of about 0.6, that is visibly coarse on large curves.

- Add an optional parameter `tolerance_mm: float | None = None` to `path_to_shapely`. When `None`, the current fixed steps are used, so the Cake Topper is unchanged. When set, compute the segment count per curve from the control-polygon length so that chord error ≤ tolerance. Clamp to 4–64 steps.
- Keychain tolerance: `0.02 mm` at final scale, so `0.02 / s_expected` at reference size. For preview quality use `0.05 mm`.

## 5.6 Production Check (validation)

New module `backend/app/keychain_validation.py`, with pure functions over Shapely geometry and the material profile (`get_material()`).

| Check ID | Rule | Severity | Fix payload |
|---|---|---|---|
| KC-BACKING-SINGLE-PIECE | backing polygon count == 1 (after ring union) | error | set `backing.offset_mm` to the smallest value that merges the pieces (search in 0.5 mm steps up to 10) |
| KC-SIZE-MIN | target ≥ minimum achievable size | error | set `size.target_mm` |
| KC-RING-WALL | `(outer − hole)/2 ≥ min_wall_thickness_mm` | warning | set `ring.outer_diameter_mm` |
| KC-RING-NECK | neck ≥ `min_neck_width_mm` | warning | `{"action":"snap_ring"}` |
| KC-RING-TOUCH | ring intersects backing | error | `{"action":"snap_ring"}` |
| KC-HOLE-CLEARANCE | `hole.distance(text_s) ≥ 1.0 mm` | warning | move ring (`snap_ring`) |
| KC-BACKING-MIN-FEATURE | area of `backing − opening(backing, w/2)` ≤ 0.5 mm², `w = material.minimum_feature_size_mm` | warning | increase `backing.smoothing_mm` |
| KC-TEXT-FLOATING-PARTS (layered) | no text component smaller than 4 mm² | warning | set `dots.auto_join=true` |
| KC-TEXT-MIN-STROKE (layered) | opening test on text with material minimum feature size | warning | set `stroke_buffer_mm=0.3` |
| KC-MISSING-GLYPHS | no `.notdef` glyphs | warning | `{"action":"filter_fonts_supporting_text"}` |
| KC-SIZE-CONVERGED | solver reached tolerance | info / warning | — |

- Each failing check includes `highlight_bbox_mm` where meaningful.
- Passing checks are returned with severity `pass`, so the UI can show "N passed".

## 5.7 SVG output (export)

Structure:

```xml
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">
  <!-- EnS Designer — Keychain Recipe … human-readable lines … -->
  <metadata id="ens-recipe">{JSON recipe, XML-escaped}</metadata>
  <g id="CUT_BACKING"><path d="…compound path with hole…" fill="{backing}" stroke="none" fill-rule="nonzero"/></g>
  <g id="ENGRAVE_TEXT"|"CUT_TEXT"><path d="…Bézier text…" fill="{text}" stroke="none" fill-rule="nonzero"/></g>
</svg>
```

- Build it with `svgwrite`, as `_assemble_svg` does, so the output is valid XML. Add a test that parses every export with `xml.etree` (guards against vectorsfile bug W4).
- Coordinates are rounded to 3 decimals.
- **Layered + separate:** two files, `<name>-keychain-<W>mm-backing.svg` and `<name>-keychain-<W>mm-text.svg`. Both use the same canvas and origin so they align when imported together.
- **Preview SVG:** same structure without `<metadata>`. Add `data-glyph-index` attributes on per-glyph hit paths (transparent) for the inspector, mirroring the vectorsfile approach. The `glyphs[].bbox_mm` list is also returned.
- Filenames use `_safe_filename` (from `overlap_helpers`).
- **Verify in LightBurn** (manual QA): the two colours land on separate layers, and the size is correct within 0.1 mm.

## 5.8 API routes (`backend/app/api/routes/keychain.py`)

| Method | Path | Behaviour |
|---|---|---|
| POST | `/api/keychain/preview` | `quality` forced to `preview`; no PNG; no `files`; target < 150 ms p95 warm |
| POST | `/api/keychain/export` | `quality` forced to `export`; returns `files` + `png_base64` |
| GET | `/api/keychain/history` | list of keychain history entries (newest first) |
| POST | `/api/keychain/history` | append an entry `{recipe, filename, width_mm, height_mm}` |

- Error handling mirrors `api/routes/cake_topper.py`: `ValueError` → 400 with message; anything else → 400 "Keychain generation failed." with the exception logged.
- Log `timings_ms` at debug level for each request.

**History:** `HistoryStore` hardcodes `cake_topper_history.json`.
- Add an optional constructor parameter `filename: str = "cake_topper_history.json"`. The default keeps current behaviour.
- Create a separate keychain store using `keychain_history.json`, with its own Pydantic entry model (`KeychainHistoryEntry`) so the cake topper history schema is untouched.

## 5.9 Frontend (`frontend/src/features/keychain/`)

```text
features/keychain/
  components/
    KeychainTab.tsx            # layout: top bar, controls, preview, check panel, export bar
    KeychainTopBar.tsx         # name input, style toggle, preset menu, undo/redo, status, export menu
    controls/FontSection.tsx   # wraps existing FontPicker; suitability badges; supports-text filter
    controls/SizeSection.tsx   # width/height mode, value, unit switch
    controls/BackingSection.tsx
    controls/RingSection.tsx   # positions, sizes, offsets, auto-snap toggle, wall/neck readout
    controls/LettersSection.tsx# overlap mode, per-gap list, dot auto-join + %
    controls/LayersSection.tsx # colours, layered export mode
    KeychainPreview.tsx        # renders preview_svg; zoom; view filter; ring + letter drag (ghost technique)
    LetterInspector.tsx        # selected glyph: nudge/scale/rotate/dot offset/reset
    ProductionCheckPanel.tsx   # counts, items, Fix buttons, highlight on hover/click
    KeychainExportBar.tsx      # size readout, Download SVG/PNG, Next name
    KeychainHistoryList.tsx
  state/
    keychainTypes.ts           # KeychainState (UI state), mirrors KeychainRequest
    keychainReducer.ts         # pure reducer; actions for every control; applyFix(fix)
    toRequest.ts               # KeychainState → KeychainRequest (mm), presets, defaults
    useUndoRedo.ts             # 100-step snapshot stack; typing coalesces per pause
  services/
    keychainApi.ts             # preview(), export(), history()
  hooks/
    useKeychainPreview.ts      # debounce + AbortController + request_id ordering + last-good result
    useKeyboardShortcuts.ts    # Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, arrows, Esc, Enter (next name)
  utils/
    units.ts                   # mm↔cm↔inch display only
    fontSuitability.ts         # maps Font Adviser score/category → Recommended/OK/Caution
  tests/
    keychainReducer.test.ts
    toRequest.test.ts
    useKeychainPreview.test.ts
    useUndoRedo.test.ts
    units.test.ts
    KeychainTab.smoke.test.tsx
```

### `useKeychainPreview` contract (critical for performance and correctness)

- Input: `request` (memoised).
- Debounce: 150 ms for text, 120 ms for sliders. Commits (release, select, toggle) fire immediately.
- Each call increments `seq`, aborts the previous `AbortController`, and sends `request_id=seq`.
- Apply a response **only if** `response.request_id === latestSeq`. This fixes the out-of-order risk present in today's `CakeTopperPanel.callApi`.
- Keep `lastGood` (response) and `status` (`idle | updating | error`). Never clear `lastGood` on error.

### Font suitability

`utils/fontSuitability.ts` derives the badge from the existing Font Adviser data: `config/cakeTopperFontRecommendations.ts` and the heuristic. If the adviser has no data for a font, show no badge; never invent one.

### "Fonts that support this name" filter

Use the existing `fetchFontCharacters(fontId)` endpoint on demand, with results cached per font in memory. Show a progress state; do not block the UI.

### App integration

In `App.tsx`:
- Add `"keychain"` to `WorkspaceTab` and a nav entry labelled **Keychain**, right after **Designer**.
- Render it inside `<Activity mode=…>` the same way `CakeTopperPanel` is, so state survives tab switches.

### Styling

Follow `Etch_N_Shine_Universal_Application_Design_System.md`. Use a `kc-` class prefix in `styles.css` (or a new `features/keychain/keychain.css` imported by the tab). Do not change existing `ct-` styles.

### Preview drag

Copy the pointer-capture plus direct-DOM transform pattern from `PreviewPanel.tsx`:
- Convert pixels to mm on release using the preview SVG's viewBox and the client rect.
- Dispatch `ring/move` or `glyph/move`.
- Keyboard nudge: 0.1 mm, or 1 mm with Shift.

---

# 6. Milestones (stop and report after each)

| Milestone | Content | Exit criteria |
|---|---|---|
| **K0: Baseline** | Environment check (§0.4); `scripts/bench_keychain.py` that times the current Cake Topper path (outline + ring) for the corpus in §9.3; capture golden SVG fixtures | Baseline timings recorded in the handoff; fixtures committed under `tests/fixtures/keychain_baseline/` |
| **K1: Shared foundations** | `font_cache.py`; optional `loaded=` on shaper/extractor; `ring_geometry.py` extraction with aliases; `HistoryStore(filename=…)`; `path_to_shapely(tolerance_mm=None)`; font-cache invalidation on upload/delete | All existing tests pass; golden Cake Topper SVGs identical; benchmark shows a warm-path improvement |
| **K2: Keychain engine + API** | Models, `keychain_engine.py`, `keychain_validation.py`, `join_floating_components`, routes, history store, SVG/PNG export | Backend unit and integration tests in §9 pass; preview p95 < 150 ms warm on the corpus (benchmark) |
| **K3: Keychain tab (MVP UI)** | Tab, top bar, font/size/backing/ring/letters/layers sections, preview with ring drag, Production Check (read-only fixes allowed), export bar, presets, units | Manual journey Stages 0–6, 8–9 work end to end; frontend tests and build pass |
| **K4: Editing power** | Letter Inspector (glyph transforms, selection by cluster), undo/redo, Next name, history list and reload | Journey Stages 7 and 10 work; undo/redo tests pass |
| **K5: Hardening** | Fix actions wired for every check; highlight; accessibility pass; error states; QA matrix; LightBurn validation; docs and handoff | Acceptance criteria in §11 all met |

---

# 7. Files

## 7.1 Files to create

Backend:
- `backend/app/font_cache.py`
- `backend/app/ring_geometry.py`
- `backend/app/keychain_engine.py`
- `backend/app/keychain_validation.py`
- `backend/app/api/routes/keychain.py`

Scripts:
- `scripts/bench_keychain.py` (repo `scripts/` folder; prints p50/p95 per stage)

Tests:
- `tests/test_font_cache.py`
- `tests/test_ring_geometry.py` (parity with the Cake Topper ring behaviour)
- `tests/test_keychain_engine.py`
- `tests/test_keychain_validation.py`
- `tests/test_keychain_api.py`
- `tests/test_keychain_svg_export.py`
- `tests/fixtures/keychain_baseline/*.svg`

Frontend: everything under `frontend/src/features/keychain/` (§5.9).

Docs:
- `docs/handoffs/keychain-designer-k0-…k5-*.md` (one per milestone)
- `docs/qa/KEYCHAIN_QA_MATRIX.md`
- `docs/adr/ADR-006-KEYCHAIN-ENGINE-AND-PERFORMANCE.md` (records AD-1 to AD-6)

## 7.2 Files to modify (minimal, additive)

| File | Change |
|---|---|
| `backend/app/models.py` | Add Keychain section (§5.2) |
| `backend/app/main.py` | Create `KeychainService` and keychain history store; include the keychain router **before** the static mount |
| `backend/app/text_shaper.py` | Optional `loaded` parameter (default path unchanged) |
| `backend/app/outline_extractor.py` | Optional `loaded` parameter (default path unchanged) |
| `backend/app/shapely_converter.py` | Optional `tolerance_mm` in `path_to_shapely` (default unchanged) |
| `backend/app/floating_component.py` | Add `join_floating_components` (existing functions untouched) |
| `backend/app/cake_topper_engine.py` | Replace moved helper bodies with imports/aliases from `ring_geometry.py`; no logic change |
| `backend/app/history_store.py` | Optional `filename` parameter |
| `backend/app/api/routes/fonts.py` | Call `clear_font_cache()` after upload/delete |
| `frontend/src/App.tsx` | Add tab and Activity wrapper |
| `frontend/src/types/design.ts` | Keychain request/response types (or keep them in `features/keychain/state/keychainTypes.ts`; prefer the feature folder) |
| `frontend/src/styles.css` | Import or append `kc-` styles only |
| `README.md` | Keychain workflow section, API endpoints, test counts |
| `docs/phases/PHASE_INDEX.md` | Add this phase |
| `docs/deployment-log.md` | Entry per milestone |

Do **not** modify `CakeTopperPanel.tsx`, `PreviewPanel.tsx` or any Cake Topper tests, except to add new tests.

---

# 8. Dependencies

## 8.1 New dependencies

None required. Everything is covered by the existing Shapely 2.1.2 (`affinity`, `ops.nearest_points`), uharfbuzz, fontTools, svgwrite, cairosvg and React.

`pyclipper` is already in `requirements.txt` but unused by this plan. Do not introduce it unless Shapely buffering cannot meet the performance budget. Record any such decision in ADR-006.

## 8.2 Existing dependencies affected

- **uharfbuzz / fontTools:** object reuse under locks (§5.1).
- **Shapely:** heavier use of `buffer`. Profile with `quad_segs=16`; preview may use `quad_segs=8`.

---

# 9. Testing Strategy

## 9.1 Unit tests (backend)

- **Font cache:**
  - Same object on a repeated call.
  - Invalidated when mtime changes.
  - `clear_font_cache` works.
  - Concurrent shaping from 8 threads gives identical output.
- **ring_geometry parity:** for the existing `TestCakeTopperRing` scenarios, the extracted functions return identical geometry (WKT equality, rounded to 1e-6).
- **fill_counters:** "O", "B", "e" at 60 mm with a 3 mm offset give 0 interiors when on and more than 0 when off.
- **smoothing:** a two-letter gap notch narrower than 2k is filled; the outer offset on a straight edge stays `offset ± 0.02 mm`.
- **Size solver:**
  - For targets 30/60/90 mm, width mode, three fonts: |achieved − target| ≤ 0.05 mm.
  - Height mode the same.
  - Aspect ratio of the text bbox unchanged within 0.1% (uniform-scaling guarantee).
  - Below-minimum target returns `converged=False` and `KC-SIZE-MIN`.
- **Ring snap:** the ring placed 30 mm away ends with neck ≥ 5 mm and `snapped=True`; with `auto_snap=False` the error `KC-RING-TOUCH` is raised.
- **Ring hole:** the hole diameter in the output equals the request ±0.01 mm at every target size (never scaled).
- **Dot join:** for "i" and "j" in a script font and a sans font, the dot and stem intersect with overlap ≈ pct × dot height (±10%); manual offsets are applied after the join.
- **Glyph transforms:** rotate/scale about the bbox centre; Bézier commands preserved (command types unchanged).
- **Cluster mapping:** ligature fonts return one `KeychainGlyphInfo` per glyph with the correct `cluster_text`.
- **Validation:** each check id has a pass case and a fail case.

## 9.2 Integration tests (API)

- `/api/keychain/preview`: 200; `png_base64 is None`; `request_id` echoed; `preview_svg` parses as XML.
- `/api/keychain/export`, engraved: one file; `CUT_BACKING` and `ENGRAVE_TEXT` groups; mm units; viewBox matches `width_mm`/`height_mm` within 0.01; `<metadata id="ens-recipe">` JSON round-trips to an equivalent request.
- Export, layered + separate: two files with identical viewBox.
- Missing glyph text: 200 with a warning, or 400 with a clear message when nothing can render (mirror the Cake Topper rule).
- Invalid ranges: 422.
- History: POST then GET returns the entry; the cake topper history file is untouched.
- **Regression:** the full existing test suite, plus a golden-file comparison of the Cake Topper SVGs from K0.

## 9.3 Corpus (benchmark and golden)

- **Names:** "Sarah", "Ali", "Jo", "Maximilian", "Mr Bear", "Zoë", "fifi" (ligatures), "سارة" (Arabic, with a font that supports it).
- **Fonts:** one script (for example a Manual Font script), one bold display (Anton or Bebas), one serif.
- **Cake Topper golden recipes** (for K0/K1 parity):
  - "Happy Birthday Sarah" with defaults
  - The same with outline + ring
  - The same with 2 stakes

## 9.4 Frontend tests (Vitest, existing setup)

- Reducer: every action; `applyFix` for each fix payload.
- `toRequest`: unit conversion and defaults.
- `useKeychainPreview`:
  - Debounce timing.
  - Abort of the previous request.
  - Out-of-order responses ignored.
  - `lastGood` retained on error.
- `useUndoRedo`: 100-step cap; typing coalesces.
- Smoke: tab renders, typing triggers a preview call (mock fetch), export buttons are disabled while the text is empty.
- `npm.cmd run build` passes.

## 9.5 Manual testing

- Walk through Journey Stages 0–10 with the corpus.
- Import exports into LightBurn and check:
  - Layers split by colour.
  - Dimensions within 0.1 mm.
  - Hole measures 5.0 mm.
  - No repair needed.
- Record the evidence in `docs/qa/KEYCHAIN_QA_MATRIX.md` (format of `CAKE_TOPPER_QA_MATRIX.md`).
- Cut at least 3 test pieces (engraved and layered) on 3 mm cast acrylic. Note results in the final handoff.

---

# 10. Documentation Updates Required

- `README.md`: Keychain Designer workflow (in the style of the Cake Topper section), API table rows, updated test counts, Latest Updates entry.
- `docs/phases/PHASE_INDEX.md`: add Phase K with links to the journey and this plan.
- `docs/adr/ADR-006-KEYCHAIN-ENGINE-AND-PERFORMANCE.md`.
- `docs/architecture/LIGHTBURN_COMPATIBILITY_AND_EXPORT_SPECIFICATION.md`: document the new multi-layer output (cut + engrave) for the keychain. This activates the "Future: layer strategy" section for keychains only.
- `docs/qa/KEYCHAIN_QA_MATRIX.md`.
- `docs/handoffs/`: one handoff per milestone per `HANDOFF_DOCUMENTATION_STANDARD.md` (work done, files, tests, known issues, risks, recommendations, benchmark numbers).
- `docs/deployment-log.md`: one entry per milestone with the commit hash.

---

# 11. Acceptance Criteria

1. A **Keychain** tab exists; switching tabs preserves its state; the Cake Topper Designer is unchanged:
   - All pre-existing tests pass.
   - Golden Cake Topper SVGs are byte-identical, or differences are limited to explicitly approved, documented cases.
2. From an empty tab, typing "Sarah" produces a preview with no other input. With defaults, the export:
   - is exactly 60.00 mm wide (±0.05 mm);
   - has a one-piece solid backing;
   - has a 5.0 mm hole (±0.01 mm) attached with neck ≥ 5 mm;
   - has text in `#FF0000` and backing in `#000000`;
   - has zero Production Check errors.
3. Preview update p95 ≤ 150 ms on the server and ≤ 250 ms end-to-end for ≤ 12 glyphs with a warm font, measured by `scripts/bench_keychain.py` and recorded in the K5 handoff. First preview ≤ 800 ms cold. Export ≤ 1.5 s.
4. Rapid input (typing 10 characters quickly, dragging sliders) never shows a stale result after the final input. Verified by test and manually.
5. Every SVG parses as XML and imports into LightBurn with correct size (±0.1 mm) and separate layers per colour, with no manual repair. Evidence is in the QA matrix.
6. Text in exports keeps Bézier commands (`Q`/`C` present for curved fonts). The backing contains the hole as an inner contour of a compound path.
7. Uniform scaling: the text bbox aspect ratio is unchanged by the size solver (±0.1%).
8. Every Production Check failure shows a message; every check with a fix payload applies correctly in the UI and clears the issue, or explains why not.
9. Undo/redo covers every control and canvas action (100 steps). Next name keeps all settings.
10. Layered style: combined and separate exports both work; separate files align when imported together.
11. Accessibility: all controls are reachable and operable by keyboard; status is never conveyed by colour alone.
12. Documentation and handoffs are updated as listed in §10.

---

# 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Refactor of ring helpers changes Cake Topper output | High | Alias-only extraction; golden SVG byte comparison; parity tests; separate commit that is easy to revert |
| Thread-safety of cached `TTFont`/HarfBuzz objects | High | Per-font `RLock`; concurrency test; cache optional for the Cake Topper |
| Size solver fails to converge for odd geometry (rings, extreme transforms) | Medium | Bisection guard, 6-iteration cap, report `converged=False` + warning, never block export |
| Preview budget missed for long script names | Medium | Union once at reference size and scale with affinity; preview `quad_segs=8` and 0.05 mm tolerance; benchmark per stage; only then consider pyclipper (ADR) |
| Shapely invalid geometry after transforms | Medium | `buffer(0)` repair after transforms; validation check; tests with rotation ±45° |
| Glyph index vs character mismatch (ligatures, Arabic) breaks the inspector | Medium | Select by glyph cluster; `cluster_text` from HarfBuzz clusters; tests with "fi" and Arabic |
| LightBurn colour-to-layer mapping differs from expectation | Low | Colours configurable; validate in LightBurn and document in the QA matrix |
| Python environment hangs on import (observed 2026-11-06) | Medium | §0.4 check first; report instead of working around |
| Dropbox file locking during builds and tests | Low | Existing Vite cache location; retry guidance per README |
| Scope creep (batch, cut-out style, shapes) | Medium | Explicitly excluded; captured in §13 |

---

# 13. Future Milestones (not in this phase)

- **K6, cut-out name style:** use the connectivity/overlap engine to weld the letters and attach the ring directly to the text (no backing). Require a single connected component; reuse the bridge fallback.
- **K7, batch mode:** paste a list of names → generate all with the current recipe → nest on a sheet (material size) → one SVG per sheet plus a per-name list.
- **K8, shapes:** heart, star and rounded-rectangle backings; double-hole tags.
- **K9, client-side engine:** only if the AD-1 revisit criteria are met.

---

# 14. Decisions to Confirm Before Starting

The plan uses these defaults; change them here before approval if needed:

1. Default layer colours: backing `#000000`, text `#FF0000`.
2. Default finished width: 60 mm. Presets: Mini Charm 40 mm, Name Keychain 60 mm, Bag Tag 90 mm.
3. Name length limit: 40 characters, single line.
4. Layered style default export: one combined SVG.
5. "Export anyway" allowed with errors after confirmation (rather than blocking export).

---

# Recommended Commit Messages

- `chore(keychain): add baseline benchmark and cake topper golden fixtures` (K0)
- `refactor(geometry): extract shared ring helpers and add parsed-font cache` (K1)
- `feat(keychain): add keychain engine, validation and API` (K2)
- `feat(keychain): add keychain designer tab` (K3)
- `feat(keychain): add letter inspector, undo/redo, history and next name` (K4)
- `feat(keychain): production check fixes, accessibility and QA` (K5)

---

# Recommended Release Tag

Next minor version after the current tag at K5 completion.

---

# Approval

Approved By:

Approval Date:

---

# End of Document
