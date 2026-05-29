# phase-1a-harfbuzz-integration-plan.md

## Purpose

Define the approved Phase 1A HarfBuzz integration plan.

This plan implements ADR-001 without introducing new architecture decisions.

---

# Integration Strategy

Recommended Python binding:

- uharfbuzz

Reason:

It provides Python access to HarfBuzz shaping and is available through PyPI.

Fallback:

If uharfbuzz is blocked by installation, licensing, or runtime issues, stop and escalate before changing ADR-001.

---

# Text Shaping Pipeline

1. Receive text input.
2. Trim leading and trailing whitespace.
3. Reject empty text.
4. Unicode-normalise input using NFC.
5. Load selected font bytes.
6. Create HarfBuzz face and font.
7. Create HarfBuzz buffer.
8. Add normalised text to buffer.
9. Set script, language, and direction using HarfBuzz defaults unless explicit handling is needed.
10. Shape text with HarfBuzz.
11. Extract shaped glyph IDs, clusters, advances, and offsets.
12. Pass shaped glyph sequence to outline extraction.
13. Convert positioned outlines into Canonical Geometry Model.

---

# Supported Phase 1A Text Cases

Required:

- Oliver
- Amelia
- Muhammad
- O'Connor
- Lea
- Léa

Additional:

- Single character: A
- Empty string rejection
- Leading/trailing spaces trimming
- Repeated letters: Hannah
- Hyphenated text: Ava-Rose

---

# Out Of Scope

- Manual kerning controls
- Text-on-path
- Multi-line layout
- Right-to-left UI workflow
- Advanced typography editing
- Font fallback chains
- Welding
- Bridge generation

---

# Output Contract

The HarfBuzz shaping step must output:

```json
{
  "glyphs": [
    {
      "glyphId": 123,
      "cluster": 0,
      "advanceX": 12.3,
      "advanceY": 0.0,
      "offsetX": 0.0,
      "offsetY": 0.0
    }
  ]
}
```

The shape output is not the Canonical Geometry Model. It is an input to outline extraction.

---

# Risks

| Risk | Impact | Mitigation |
|---|---|---|
| uharfbuzz installation issue on Windows | Blocks shaping implementation | Validate installation before coding core pipeline. |
| Glyph ID mapping differs between fontTools and HarfBuzz expectations | Incorrect outlines | Test with simple known fonts and compare glyph counts/positions. |
| Accented characters fail due to normalisation issues | Customer names render incorrectly | Use NFC normalisation and include Léa in tests. |
| Font lacks glyph for input character | Missing output | Return clear unsupported character/font error. |

---

# Acceptance Criteria

- HarfBuzz produces shaped glyph IDs for approved test names.
- Advances and offsets are captured.
- Accented character test passes for Léa with a supporting font.
- Unsupported characters produce a clear error.
- No welding, bridge, material, AI, or DXF logic is introduced.

