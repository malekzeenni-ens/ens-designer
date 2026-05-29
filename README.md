# README.md

# AI SVG Generator

AI SVG Generator is a local-first application designed for Etch 'N' Shine to generate production-ready SVG and PNG files for laser cutting.

The platform automates:

- Text welding
- Letter connections
- Bridge generation
- Structural validation
- Cake topper generation
- AI-assisted artwork generation

Future versions will provide a complete AI-powered design studio for laser businesses.

---

# Current Application

Phase 1A is implemented as a local deterministic text-to-vector MVP.

Current workflow:

```text
Text Input
-> Font Selection
-> Generate
-> Preview
-> Download SVG
-> Download PNG
```

Phase 1A intentionally does not include welding, bridge generation, material validation, cake toppers, SVG import and repair, AI features, DXF export, decorative assets, batch processing, or SaaS/cloud features.

---

# Font Sources

Phase 1A discovers fonts from:

- `/fonts` inside this repository
- `C:\Users\malek\Dropbox\_Etch_n_Shine\Fonts`
- `C:\Windows\Fonts`

Supported font files:

- `.ttf`
- `.otf`

The Dropbox font library is scanned recursively. Zip files are not unpacked by the application.

Restart the backend after adding or removing fonts.

---

# Running Locally

## Backend

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If PowerShell treats the Python path above oddly, run this equivalent command from the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

## Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

---

# Testing

Backend tests:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

---

# Vision

Reduce the time required to create laser-ready artwork from minutes to seconds while maintaining manufacturing quality and structural integrity.

---

# Current Roadmap

## Phase 00

Repository & Architecture Assessment

## Phase 01

MVP Foundation

### Phase 1A

Core Text Generation

### Phase 1B

Welding & Validation

### Phase 1C

Production Hardening

## Phase 02

Cake Topper Generator

## Phase 03

SVG Import & Repair

## Phase 04

Decorative Asset Library

## Phase 05

AI Graphic Generator

## Phase 06

AI Design Studio

---

# Technology Stack

Frontend

- React
- TypeScript
- Vite

Backend

- Python
- FastAPI
- Pydantic

Geometry

- Canonical Geometry Model

Fonts

- FontTools
- HarfBuzz
- uharfbuzz

SVG

- svgwrite

PNG

- CairoSVG when native Cairo is available
- Pillow fallback for local Windows environments without Cairo

---

# Repository Structure

docs/
frontend/
backend/
tests/
assets/
fonts/
exports/
logs/

---

# Key Documentation

Business:

- /docs/business/BUSINESS_CONTEXT.md
- /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md

Architecture:

- /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
- /docs/architecture/TECHNICAL_SOLUTION_DESIGN.md
- /docs/architecture/DATA_MODEL_AND_API_DESIGN.md

Delivery:

- /docs/governance/PHASED_DELIVERY_PLAN.md
- /docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md
- /docs/governance/TESTING_AND_QA_STRATEGY.md

---

# Development Workflow

1. Review documentation
2. Create implementation plan
3. Obtain approval
4. Implement scope
5. Execute testing
6. Update documentation
7. Update handoff
8. Commit changes
9. Tag release

---

# Release Strategy

v0.1.0 -> Phase 1A Core Text Generation

v0.2.0 -> Phase 1B Welding & Validation

v0.3.0 -> Phase 1C Production Hardening

v0.4.0 -> Cake Topper Generator

v0.5.0 -> SVG Import & Repair

v0.6.0 -> Decorative Asset Library

v0.7.0 -> AI Graphic Generator

v1.0.0 -> AI Design Studio

---

# End of Document
