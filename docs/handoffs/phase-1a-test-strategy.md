# phase-1a-test-strategy.md

## Purpose

Define Phase 1A test strategy.

Testing must prove the deterministic text-to-vector foundation without testing out-of-scope welding, bridge generation, material validation, AI, DXF, SVG import, or cake topper functionality.

---

# Required Name Test Set

The required Phase 1A text cases are:

- Oliver
- Amelia
- Muhammad
- O'Connor
- Léa

Additional cases:

- Lea
- A
- Hannah
- Ava-Rose
- Leading and trailing spaces
- Empty input rejection
- Unsupported character handling

---

# Font Test Set

Minimum categories:

- Script
- Serif
- Sans
- Decorative

Phase 1A may use a small controlled fixture set. Commercial production font testing can expand later.

---

# Unit Tests

## Unicode Normalisation

Validate:

- Whitespace trimming.
- Empty input rejection.
- NFC normalisation for Léa.

## HarfBuzz Shaping

Validate:

- Glyph IDs are returned.
- Advances and offsets are captured.
- Apostrophe handling works for O'Connor.
- Accented character handling works for Léa when the font supports it.

## Outline Extraction

Validate:

- Shaped glyph IDs map to outlines.
- Non-empty text produces at least one path.
- Missing glyph produces clear error.

## Canonical Geometry

Validate:

- Units are mm.
- Bounds are finite.
- Paths are serialisable.
- Required fields are present.

## SVG Export

Validate:

- SVG contains width, height, viewBox, xmlns, and path data.
- SVG does not include unsupported Phase 1A features.

## PNG Export

Validate:

- PNG is generated from SVG.
- PNG error handling is explicit.

---

# Integration Tests

Test full pipeline:

Text Input
-> Unicode Normalisation
-> HarfBuzz Shaping
-> Outline Extraction
-> Canonical Geometry Model
-> SVG Export
-> PNG Export

Run for:

- Oliver
- Amelia
- Muhammad
- O'Connor
- Léa

---

# UI Smoke Tests

Validate:

- Text input accepts a name.
- Font selector displays available fonts.
- Generate button triggers local generation.
- Preview displays generated SVG.
- Download SVG is available.
- Download PNG is available.

---

# Manual Tests

For each required name:

1. Generate design.
2. Preview output.
3. Export SVG.
4. Export PNG.
5. Open SVG in browser.
6. Import SVG into LightBurn.
7. Confirm dimensions appear reasonable.

---

# Out Of Scope Tests

Do not test:

- Welding
- Bridge generation
- Material validation
- Structural validation
- Cake topper stakes
- SVG repair
- AI output
- DXF export
- Batch generation

---

# Pass Criteria

Phase 1A planning may proceed to implementation approval when:

- Test strategy is approved.
- Required names are accepted as the Phase 1A corpus.
- Font fixture approach is approved.
- No out-of-scope tests are required.

