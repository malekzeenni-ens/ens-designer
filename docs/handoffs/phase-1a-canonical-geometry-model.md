# phase-1a-canonical-geometry-model.md

## Purpose

Define the minimum Canonical Geometry Model required for Phase 1A.

This model is intentionally small. It supports shaped text outline export only. It does not include connectivity resolution, bridge fallback, material validation, structural scoring, SVG import, DXF, AI, or manufacturing simulation.

---

# Phase 1A Geometry Principles

- SVG is an export format, not the working model.
- Canonical geometry is created after text shaping and outline extraction.
- Geometry must preserve text appearance, positioning, scale, and units.
- The model must be serialisable for API responses and tests.

---

# Minimum Model

```json
{
  "geometryId": "uuid",
  "source": {
    "text": "Oliver",
    "fontId": "font-id",
    "fontName": "Font Name"
  },
  "units": "mm",
  "coordinateSystem": {
    "origin": "top-left",
    "yAxis": "down"
  },
  "dimensions": {
    "width": 120.0,
    "height": 42.0
  },
  "glyphs": [
    {
      "glyphId": 123,
      "cluster": 0,
      "advanceX": 12.3,
      "advanceY": 0.0,
      "offsetX": 0.0,
      "offsetY": 0.0,
      "pathIds": ["path-001"]
    }
  ],
  "paths": [
    {
      "pathId": "path-001",
      "commands": [
        {"type": "M", "x": 0.0, "y": 0.0},
        {"type": "L", "x": 10.0, "y": 0.0},
        {"type": "Q", "x1": 12.0, "y1": 3.0, "x": 10.0, "y": 6.0},
        {"type": "Z"}
      ],
      "closed": true
    }
  ],
  "bounds": {
    "minX": 0.0,
    "minY": 0.0,
    "maxX": 120.0,
    "maxY": 42.0
  },
  "exportMetadata": {
    "svgReady": true,
    "pngReady": true
  }
}
```

---

# Required Fields

## geometryId

Unique identifier for a generated geometry result.

## source

Captures the input text and selected font metadata.

## units

Must be millimetres for Phase 1A export.

## coordinateSystem

Must be explicit so text layout can be transformed consistently into SVG.

## dimensions

Overall design dimensions after shaping and outline extraction.

## glyphs

Represents HarfBuzz-shaped glyph output and links each glyph to extracted paths.

## paths

Represents outline commands in an implementation-neutral way.

## bounds

Bounding box for preview and export sizing.

## exportMetadata

Signals whether SVG and PNG export can proceed.

---

# Explicitly Excluded From Phase 1A Model

- Welded geometry
- Bridge objects
- Material profile metadata
- Structural validation scores
- Connectivity graph
- Cut layer metadata
- Score layer metadata
- Engrave layer metadata
- DXF metadata
- AI prompt metadata

---

# Validation Rules

The Phase 1A model is valid when:

- Text and font metadata are present.
- Units are millimetres.
- Bounds are finite numbers.
- At least one path exists for non-empty text.
- Paths use supported commands only.
- Export metadata marks SVG readiness true.

---

# Future Extension Points

Phase 1B may add:

- Connectivity relationships
- Welded geometry state
- Bridge objects
- Material validation metadata

Phase 1C may add:

- Manual bridge override metadata
- Golden test corpus result metadata
