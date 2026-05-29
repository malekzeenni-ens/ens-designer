# MATERIAL_PROFILE_ENGINE_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Engine Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the Material Profile Engine responsible for applying material-specific manufacturing rules to generated SVG designs.

The engine ensures that designs generated for plywood, MDF, acrylic, mirror acrylic, and future materials are structurally appropriate before export.

---

# Objectives

1. Improve cut success rates.
2. Apply material-aware validation.
3. Reduce design failures.
4. Support automatic recommendations.
5. Enable future AI-assisted manufacturing optimisation.

---

# Supported Materials (Initial Roadmap)

## Wood

- Birch plywood
- Poplar plywood
- MDF

---

## Acrylic

- Cast acrylic
- Extruded acrylic
- Mirror acrylic
- Pastel acrylic

---

# Material Profile Structure

```json
{
  "materialId": "cast-acrylic-3mm",
  "materialName": "3mm Cast Acrylic",
  "thickness": 3,
  "minimumBridgeWidth": 2.5,
  "minimumFeatureSize": 1.5,
  "recommendedConnectionWidth": 3.0
}
```

---

# Engine Responsibilities

## Material Selection

Allow user to select:

- Material type
- Thickness

---

## Rule Application

Apply:

- Minimum bridge widths
- Minimum feature sizes
- Reinforcement thresholds

---

## Validation Enhancement

Adjust validation scoring based on:

- Material strength
- Material brittleness
- Material thickness

---

# Recommended Initial Profiles

## 3mm Cast Acrylic

Characteristics:

- Strong
- Predictable cutting
- Good detail retention

---

## 3mm Mirror Acrylic

Characteristics:

- Decorative
- More visible imperfections
- Requires stronger connections

---

## 3mm Plywood

Characteristics:

- Strong
- Forgiving
- Excellent for name signs

---

# Future Enhancements

## Phase 5

AI material recommendations.

## Phase 6

Automatic manufacturing optimisation.

---

# Acceptance Criteria

- Material profiles selectable
- Validation adapts to material
- Export metadata includes material profile
- Documentation updated

---

# End of Document
