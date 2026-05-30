# TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Technical Architecture
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Architecture Vision

Build a local-first AI-assisted SVG generation platform capable of creating production-ready laser cutting files with minimal manual intervention.

The architecture must prioritise:

- Reliability
- Performance
- Extensibility
- Offline capability
- LightBurn compatibility
- Future AI integration

---

# Architectural Principles

## Principle 1

Local-first execution.

No cloud dependency for core SVG generation.

---

## Principle 2

Modular architecture.

Each major capability should be isolated into independent services.

---

## Principle 3

AI augmentation rather than AI dependency.

Core functionality must continue working even if AI services are unavailable.

---

## Principle 4

Production-ready outputs.

Generated files must be suitable for commercial laser cutting workflows.

---

# Recommended Technology Stack

## Frontend

Recommended:

- React
- TypeScript
- Vite
- Tailwind CSS

Reasoning:

- Fast local execution
- Excellent developer ecosystem
- Strong Codex and Claude Code support

---

## Backend

Recommended:

- Python

Reasoning:

- Strong SVG ecosystem
- Strong geometry processing libraries
- Excellent AI integrations

---

## Desktop Strategy

Recommended:

- Local Web Application (Phase 1)

Future Optional:

- Electron Desktop Wrapper

Reasoning:

- Faster development
- Easier maintenance
- Better AI integration flexibility

---

# Core System Components

## Component 1

Font Processing Engine

Responsibilities:

- Load fonts
- Normalise Unicode text
- Shape text using HarfBuzz
- Parse shaped glyphs
- Generate outlines
- Validate geometry

Suggested Libraries:

- fontTools
- freetype-py
- HarfBuzz

---

## Component 2

Vector Generation Engine

Responsibilities:

- Convert shaped glyph outlines into the Canonical Geometry Model
- Preserve geometry quality
- Prepare export-compatible geometry

Suggested Libraries:

- shapely
- pyclipper

---

## Component 3

Connectivity Resolution Engine

Responsibilities:

- Analyse whether generated geometry is already connected
- Preserve naturally connected fonts without modification
- Apply intelligent letter compression when disconnected fonts can be connected through overlap
- Union overlapping geometry
- Use structural bridges only when natural connectivity and compression fail

Suggested Libraries:

- shapely
- pyclipper

---

## Component 4

Validation Engine

Responsibilities:

- Validate connectivity
- Detect unsupported regions
- Validate material-specific constraints
- Report production readiness

Suggested Approach:

Rule-based scoring followed by clear warnings.

---

## Component 5

Structural Validation Engine

Responsibilities:

- Detect floating elements
- Detect unsupported islands
- Detect weak geometry
- Detect minimum feature violations

Output:

- Pass
- Warning
- Fail

---

## Component 6

Preview Engine

Responsibilities:

- Render SVG preview
- Display warnings
- Show validation results

---

## Component 7

Export Engine

Responsibilities:

- SVG export
- PNG export
- DXF future evaluation only

Requirements:

- LightBurn compatibility
- Accurate scaling

---

# AI Architecture

## Phase 1A to Phase 1C

AI Usage:

None required.

SVG generation, connectivity resolution, material validation, golden test corpus, LightBurn validation, and manual bridge override should remain deterministic.

---

## Phase 3

SVG Import & Repair

Workflow:

Existing SVG
→ Import
→ Canonical Geometry Model
→ Geometry Validation
→ Supported Repair
→ Re-export

---

## Phase 5

AI Graphic Generation

Workflow:

User Prompt
→ OpenAI Image Generation
→ Image Processing
→ Vectorisation
→ SVG Repair
→ Structural Validation
→ Export

---

# Data Flow

User Input
→ Unicode Normalisation
→ HarfBuzz Text Shaping
→ Font Outline Extraction
→ Canonical Geometry Model
→ Connectivity Analysis
→ Natural Connectivity Preservation
→ Intelligent Letter Compression
→ Structural Bridge Fallback
→ Validation Engine
→ Preview Engine
→ Export Engine

---

# File Storage

## Local Project Storage

Recommended Structure

/projects
/fonts
/exports/svg
/exports/png
/logs
/config

---

# Logging Strategy

Log:

- Generation requests
- Errors
- Validation failures
- Export failures

Future:

- AI generation history

---

# Security Requirements

- Local execution by default
- No automatic data upload
- Secure API key storage
- Encrypted configuration storage

---

# Performance Targets

| Metric | Target |
|----------|----------|
| SVG Generation | <30 seconds |
| Preview Render | <5 seconds |
| Export Time | <5 seconds |
| Validation Time | <10 seconds |

---

# Scalability Strategy

Future modules should plug into the architecture without affecting:

- Connectivity Resolution Engine
- Validation engine
- Export engine

Examples:

- Cake topper module
- Shape library module
- AI image module
- Design studio module

---

# Deployment Strategy

Phase 1A:

Local development environment.

Phase 1B:

Optional packaged desktop release.

Phase 1C:

Production hardening and LightBurn validation.

---

# End of Document
