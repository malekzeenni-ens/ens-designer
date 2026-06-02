# PROJECT_STRUCTURE_GUIDE.md

## Purpose

This document defines the required repository structure for the AI SVG Generator project.

All coding agents must follow this structure unless an Architecture Decision Record (ADR) explicitly approves a change.

---

# Repository Root

```text
ai-svg-generator/
│
├── README.md
├── package.json
├── requirements.txt
├── .gitignore
│
├── docs/
├── frontend/
├── backend/
├── tests/
├── assets/
├── fonts/
├── exports/
├── logs/
└── scripts/
```

---

# Documentation Structure

```text
docs/
│
├── business/
├── architecture/
├── handoffs/
├── phases/
├── adr/
└── qa/
```

---

# Business Documents

```text
docs/business/
│
├── /docs/business/BUSINESS_CONTEXT.md
├── /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md
├── /docs/business/DISCOVERY_WORKSHOP.md
├── /docs/business/BUSINESS_REQUIREMENTS_DOCUMENT_TEMPLATE.md
└── /docs/business/PRODUCT_REQUIREMENTS_DOCUMENT_TEMPLATE.md
```

---

# Architecture Documents

```text
docs/architecture/
│
├── /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
├── /docs/architecture/TECHNICAL_SOLUTION_DESIGN.md
├── /docs/architecture/DATA_MODEL_AND_API_DESIGN.md
├── /docs/architecture/RECOMMENDATION_ENGINE_DESIGN.md
├── /docs/architecture/UX_UI_SOLUTION_DESIGN.md
└── /docs/architecture/README_ARCHITECTURE_OVERVIEW.md
```

---

# Phase Documents

```text
docs/phases/
│
├── /docs/phases/PHASE_01_WELDED_TEXT_GENERATOR_IMPLEMENTATION.md
├── /docs/phases/PHASE_02_ADVANCED_STRUCTURAL_INTELLIGENCE_IMPLEMENTATION.md
├── /docs/phases/PHASE_03_CAKE_TOPPER_GENERATOR_IMPLEMENTATION.md
├── /docs/phases/PHASE_04_DECORATIVE_LIBRARY_IMPLEMENTATION.md
├── /docs/phases/PHASE_05_AI_GRAPHIC_GENERATOR_IMPLEMENTATION.md
└── /docs/phases/PHASE_06_AI_DESIGN_STUDIO_IMPLEMENTATION.md
```

---

# Handoff Documents

```text
docs/handoffs/
│
├── phase-00-discovery-handoff.md
├── phase-01-welded-text-generator-handoff.md
├── phase-02-advanced-structural-intelligence-handoff.md
├── phase-03-cake-topper-generator-handoff.md
├── phase-04-decorative-library-handoff.md
├── phase-05-ai-graphic-generator-handoff.md
└── phase-06-ai-design-studio-handoff.md
```

---

# ADR Documents

```text
docs/adr/
│
└── ADR-XXX.md
```

---

# Frontend Structure

```text
frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
│
├── public/
└── tests/
```

---

# Backend Structure

```text
backend/
│
├── app/                  ← all Python source lives here
│   ├── main.py           ← FastAPI application entry point
│   ├── models.py
│   ├── api/
│   ├── *_engine.py
│   └── ...
└── requirements.txt
```

> **Important:** `main.py` is at `backend/app/main.py`. The correct uvicorn command is:
> `python -m uvicorn app.main:app --reload` (run from the `backend/` directory).
> Using `main:app` instead of `app.main:app` will cause an "Error loading ASGI app" failure.

---

# Engine Structure

```text
backend/engines/
│
├── font_engine/
├── svg_engine/
├── welding_engine/
├── bridge_engine/
├── validation_engine/
├── export_engine/
└── ai_engine/
```

---

# Test Structure

```text
tests/
│
├── unit/
├── integration/
├── e2e/
└── fixtures/
```

---

# Naming Standards

Files:

- kebab-case for markdown documents
- snake_case for Python modules
- PascalCase for React components

---

# End of Document
