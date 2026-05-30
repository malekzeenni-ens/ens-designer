# PRODUCT_BACKLOG_AND_FUTURE_ENHANCEMENTS.md

## Purpose

This document maintains the future product backlog for the AI SVG Generator project.

Items in this document are intentionally outside the currently approved delivery scope but may be evaluated in future releases.

---

# Backlog Prioritisation

## P1 - High Priority

Strong business value.

Candidate for next release.

---

## P2 - Medium Priority

Useful enhancement.

Evaluate after core roadmap delivery.

---

## P3 - Low Priority

Nice-to-have capability.

Implement only if justified.

---

# P1 Backlog

## BL-000

Connectivity Resolution Quality Improvements

Description:

Improve deterministic connectivity resolution beyond the MVP so that the system consistently chooses the least invasive valid strategy:

1. Preserve already connected fonts such as Pacifico, Peanut Butter, and script fonts.
2. Apply intelligent letter compression for block fonts such as Anton and Oswald.
3. Use structural bridges only for layouts that cannot be connected naturally, such as Lobster leading-character cases, Happy Birthday layouts, and multi-word compositions.

Notes:

This backlog item must not turn bridge generation into the primary behaviour. Bridge quality improvements should support the fallback strategy only.

---

## BL-001

Font Upload Support

Description:

Allow users to upload custom TTF and OTF fonts.

Business Value:

Reduces dependency on pre-installed fonts.

---

## BL-002

Bulk Name Generation

Description:

Generate multiple SVG files from CSV input.

Business Value:

Supports school, corporate, and event orders.

MVP Status:

Out of scope for Phase 1A, Phase 1B, and Phase 1C.

---

## BL-003

Batch Export

Description:

Export multiple SVG and PNG files in a single operation.

Business Value:

Improves production efficiency.

---

## BL-004

Material Profiles

Description:

Store material-specific rules.

Examples:

- 3mm plywood
- 3mm cast acrylic
- 3mm mirror acrylic

Business Value:

Improves cut success rates.

MVP Status:

Initial profiles for 3mm Cast Acrylic, 3mm Mirror Acrylic, and 3mm Plywood are included in Phase 1B. Broader material libraries remain backlog.

---

# P2 Backlog

## BL-005

Multi-Line Text Layout

Description:

Support stacked names and phrases.

---

## BL-006

Circular Text Generator

Description:

Generate circular text layouts.

Examples:

- Signs
- Ornaments
- Coasters

---

## BL-007

Monogram Generator

Description:

Generate monogram designs automatically.

---

## BL-008

Nursery Sign Generator

Description:

Create layered nursery sign layouts.

---

# P3 Backlog

## BL-009

Cloud Sync

Description:

Synchronise projects between devices.

MVP Status:

Rejected for MVP.

---

## BL-010

Marketplace

Description:

Share and sell templates.

MVP Status:

Rejected for MVP.

---

## BL-011

Community Asset Library

Description:

Shared decorative asset repository.

---

# Future AI Backlog

## AI-001

Automatic Font Recommendation

Based on:

- Product type
- Occasion
- Material

---

## AI-002

Automatic Layout Optimisation

Improve balance and aesthetics.

---

## AI-003

Automatic Manufacturing Review

Analyse designs before export.

---

## AI-004

AI Design Critique

Provide recommendations to improve cutability and appearance.

---

# Review Process

Review backlog:

- At the end of every phase
- Before roadmap planning
- Before major releases

---

# End of Document
