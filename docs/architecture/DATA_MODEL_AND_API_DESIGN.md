# DATA_MODEL_AND_API_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Data Model & API Design
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Purpose

This document defines the data structures, API contracts, request flows, response models, and persistence strategy for the AI SVG Generator.

The goal is to provide a stable contract between:

- Frontend
- Backend
- Geometry Engine
- Validation Engine
- Future AI Modules

---

# Architectural Philosophy

Phase 1 should be designed API-first even if frontend and backend are hosted locally.

Benefits:

- Easier testing
- Future desktop packaging
- Better separation of concerns

---

# Core Domain Objects

## Design Project

Represents a user-generated design.

```json
{
  "projectId": "uuid",
  "projectName": "Oliver Cake Topper",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

---

## Design Request

Represents generation inputs.

```json
{
  "text": "Oliver",
  "fontId": "great-vibes",
  "outputFormat": ["svg", "png"]
}
```

---

## Font

```json
{
  "fontId": "great-vibes",
  "fontName": "Great Vibes",
  "fontCategory": "script",
  "supportsWelding": true
}
```

---

## Validation Result

```json
{
  "connectivityScore": 95,
  "structuralScore": 92,
  "productionScore": 94,
  "status": "PASS"
}
```

---

## Canonical Geometry Model

Represents the internal design geometry before export.

```json
{
  "geometryId": "uuid",
  "units": "mm",
  "dimensions": {
    "width": 120,
    "height": 45
  },
  "paths": [],
  "connections": [],
  "bridges": [],
  "materialProfileId": "cast-acrylic-3mm"
}
```

Rules:

- SVG is an export format, not the working geometry model.
- Validation engines operate on canonical geometry.
- Export engines convert canonical geometry to SVG or PNG.
- DXF remains future evaluation only.

---

# API Design

Base URL

```text
/api/v1
```

---

# Font APIs

## Get Fonts

GET

```text
/api/v1/fonts
```

Response

```json
[
  {
    "fontId": "great-vibes",
    "fontName": "Great Vibes"
  }
]
```

---

## Font Details

GET

```text
/api/v1/fonts/{fontId}
```

---

# Design APIs

## Generate Design

POST

```text
/api/v1/designs/generate
```

Request

```json
{
  "text": "Oliver",
  "fontId": "great-vibes"
}
```

Response

```json
{
  "jobId": "uuid",
  "status": "processing"
}
```

---

## Get Design

GET

```text
/api/v1/designs/{designId}
```

Response

```json
{
  "designId": "uuid",
  "svgPath": "/exports/oliver.svg",
  "pngPath": "/exports/oliver.png"
}
```

---

# Validation APIs

## Validate Design

POST

```text
/api/v1/validation
```

Response

```json
{
  "connectivityScore": 95,
  "structuralScore": 90,
  "productionScore": 93,
  "status": "PASS"
}
```

---

# Export APIs

## Export SVG

POST

```text
/api/v1/export/svg
```

---

## Export PNG

POST

```text
/api/v1/export/png
```

---

# Internal Engine Contracts

## Font Engine Output

```json
{
  "shapedGlyphs": [],
  "outlineGeometry": []
}
```

---

## Connectivity Resolution Engine Output

```json
{
  "connectedGeometry": true,
  "canonicalGeometryId": "uuid",
  "pathCount": 1
}
```

---

## Structural Bridge Fallback Output

```json
{
  "bridgesCreated": 2,
  "locations": []
}
```

---

## Validation Engine Output

```json
{
  "warnings": [],
  "errors": [],
  "status": "PASS"
}
```

---

# File Storage Structure

```text
/projects
/fonts
/exports/svg
/exports/png
/logs
/config
```

---

# Future Data Models

## Cake Topper Configuration

```json
{
  "stakeCount": 2,
  "stakeLength": 120,
  "stakeThickness": 5
}
```

---

## AI Generation Request

```json
{
  "prompt": "Steam train suitable for laser cutting"
}
```

---

# Error Response Standard

```json
{
  "success": false,
  "errorCode": "INVALID_FONT",
  "message": "Font could not be loaded."
}
```

---

# Versioning Strategy

API Version Format

```text
/api/v1
/api/v2
```

Rules:

- Breaking changes require new version.
- Additive changes remain in same version.

---

# End of Document
