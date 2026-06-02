# AI SVG Generator

AI SVG Generator is a local-first application for Etch 'N' Shine that generates production-ready SVG and PNG files for laser cutting.

---

# Current Status

**Phase 1C — Production Hardening — Complete — v0.3.0**

| Phase | Status | Release |
|---|---|---|
| Phase 1A — Core Text Generation | Complete | v0.1.0 |
| Phase 1B — Connectivity Resolution & Validation | Complete | v0.2.0 |
| Phase 1C — Production Hardening | Complete | v0.3.0 |
| Phase X — Overlap Engine + Cake Topper Tab | Complete | v0.4.0 |
| Phase 2 — Cake Topper Generator (stakes, validation, presets) | Next | v0.5.0 |
| Phase 3 — SVG Import & Repair | Future | v0.6.0 |
| Phase 4 — Decorative Asset Library | Future | v0.7.0 |
| Phase 5 — AI Graphic Generator | Future | v0.8.0 |
| Phase 6 — AI Design Studio | Future | v1.0.0 |

---

# What the Application Does

Enter a name, select a font and material, click Generate.

The application:

1. Normalises the text (Unicode NFC).
2. Shapes the text using HarfBuzz.
3. Extracts font outlines via FontTools.
4. Builds a Canonical Geometry Model.
5. Resolves connectivity using the approved order:
   - Level 1 — Natural connectivity (script fonts, overlapping letters)
   - Level 2 — Intelligent letter compression (≤ 1.5 mm per gap)
   - Level 3 — Structural bridge fallback (≤ 4 mm gaps)
6. Validates connectivity, structural quality, and material constraints.
7. Exports SVG (production) and PNG (preview).

---

# Current Workflow

## Cake Topper Designer

For laser-cut cake topper wording with multi-line composition, repo-local fonts,
default letter overlap, draggable stakes, and SVG/PNG export.

```text
Top banner: export status  +  Reset / Download SVG / Download PNG
    ↓
Enter topper text  →  Search/filter fonts  →  Choose base font and size
    ↓
Choose default letter overlap  (Light / Auto / Medium / Strong)
    ↓
Choose stakes  (0 / 1 / 2)
    ↓
Generate design
    ↓
Layout controls  →  Per-line font, position, overlap, and floating-dot controls
    ↓
Bottom export banner: SVG export size  +  Download SVG / Download PNG
```

The top banner keeps the dark branded status/action design. The bottom export
banner uses the same dark action styling while showing the SVG export size. The
Designer tab also includes a passive cutting note with detected-line chips below
the preview.

## Font Adviser

Production-aware font guidance for cake topper design. Accessible via the **Font Adviser** tab.

```text
Dark navy banner (logo + stats: loaded fonts / manual rules / top picks)
    ↓
Scoring Model accordion  (5 scoring criteria in boxes)
    ↓
Font Rankings accordion  (Top 20 | Next Best 20 — side by side)
    ↓
Font Pairings accordion
    ↓
Font Categories accordion  (4 columns: Script / Serif / Sans-serif / Supporting Text)
    ↓
Use With Caution & Not Recommended accordion  (2 columns, colour-coded)
    ↓
Production Notes accordion
```

Rankings combine manual overrides (44 rules) with heuristic fallback classification.
Ultra-heavy weight fonts (Black, Heavy, Ultra, Thick, Fat, Poster) are automatically
scored higher than regular bold fonts due to their superior structural safety for 3mm acrylic.
Fonts with no manual entry are still displayed and scored by the heuristic.

---

# Legacy Workflows

## Text Generator (Connectivity Engine)

For script fonts, decorative fonts, multi-word designs, and any layout that
needs structural connectivity analysis.

```text
Preset (optional)
    ↓
Text Input  →  Font Selection  →  Material Selection
    ↓
Generate
    ↓
Preview + Connectivity Strategy + Validation Scores
    ↓
Bridge Override (add / remove per gap, optional)
    ↓
Download SVG  /  Download PNG
```

## Overlap Engine (XCS-style workflow)

For block fonts (Anton, Oswald, Bebas, League Spartan) and simple name signs
where tracking reduction is preferred over bridge connections.

```text
Text Input  →  Font Selection
    ↓
Choose overlap mode  (Light / Auto / Medium / Strong / Custom)
    ↓
Generate
    ↓
Per-gap controls appear  (O→l, l→i, i→v, v→e, e→r …)
Each gap: toggle on/off · set its own mm amount
    ↓
Preview updates immediately on every change
    ↓
Download SVG  /  Download PNG
```

---

# Running Locally

## Install Python dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

## Start the servers (background — no terminal windows)

Both servers must always be started as hidden background processes. Run this block from the repo root:

```powershell
$root = "C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer"
New-Item -ItemType Directory -Force "$root\logs" | Out-Null

# Backend
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\backend'; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 *> '$root\logs\backend.log'"

# Frontend
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\frontend'; npm.cmd run dev *> '$root\logs\frontend.log'"
```

Logs are written to `logs\backend.log` and `logs\frontend.log`. Check them to verify startup:

```powershell
Get-Content logs\backend.log -Tail 10
Get-Content logs\frontend.log -Tail 10
```

Expected output when healthy:
- Backend: `INFO: Application startup complete.`
- Frontend: `VITE v8.x.x  ready in Xms`

## Stop the servers

```powershell
Stop-Process -Name "python","node" -Force -ErrorAction SilentlyContinue
```

## Install frontend dependencies (first time only)

```powershell
cd frontend
npm.cmd install
```

## Vite cache

Vite stores its optimized dependency cache at `C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer`
(outside Dropbox). This prevents Windows/Dropbox file-locking (`EBUSY`) errors.

> **If Vite shows `EBUSY` or `504 Outdated Optimize Dep`:** delete
> `C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer` and restart the frontend.

## Open in browser

```
http://127.0.0.1:5173
```

---

# Testing

```powershell
.\.venv\Scripts\python.exe -m pytest
```

97 tests — 0 failures (2 skipped when Lobster/Oswald are not installed).

Frontend build check:

```powershell
cd frontend
npm.cmd run build
```

---

# Font Sources

The backend discovers fonts from the repository-local font library first, then Windows system fonts:

| Source | Path |
|---|---|
| Etch N Shine project fonts | `/fonts` in this repository |
| Windows system fonts | `C:\Windows\Fonts` |

Supported formats: `.ttf` and `.otf`. Duplicates are hidden by font full name and style.

The repository `fonts/` directory is the source of truth for Etch N Shine production fonts. Restart the backend after adding or removing fonts.

---

# Production Presets

Four presets are available in the UI to pre-fill the material selector:

| Preset | Default Material |
|---|---|
| Name Sign | 3mm Cast Acrylic |
| Cake Topper | 3mm Cast Acrylic |
| Ornament | 3mm Mirror Acrylic |
| Nursery Sign | 3mm Plywood |

---

# Bridge Override

After generating a design, the validation panel shows a per-gap bridge control row.

- **+ Add** — Force-place a bridge at a gap the engine skipped.
- **× Remove** — Remove a bridge the engine placed.

Each click re-generates immediately. No save or separate submit required.

---

# Connectivity Scores

| Score | Meaning |
|---|---|
| 100 | Naturally connected — font already one piece |
| 95 | Connected via compression — small gaps closed |
| 80 | Connected via bridges — structural tabs placed |
| 35–65 | Partially bridged — some gaps remain |
| 15–35 | Disconnected — manual review required |

---

# API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/fonts | List available fonts |
| GET | /api/materials | List material profiles |
| GET | /api/presets | List production presets |
| POST | /api/generate | Generate a design (Connectivity Engine) |
| POST | /api/overlap | Generate an overlap design (Overlap Engine) |

## Overlap Engine Modes

| Mode | Target Overlap | Use Case |
|---|---|---|
| Light | 0.5 mm | Letters barely touching |
| Auto | 1.0 mm | Sensible default for most block fonts |
| Medium | 1.5 mm | Clean name-sign connection |
| Strong | 2.5 mm | Letters clearly merged |
| Custom | User mm | Precise per-design control |

Per-gap overrides can be sent via `gap_configs` in the request body — each entry specifies
`pair_index`, `enabled` (bool), and `overlap_mm`.

---

# Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI, Uvicorn, Pydantic |
| Text shaping | HarfBuzz (uharfbuzz), FontTools |
| Geometry | Shapely, Canonical Geometry Model |
| SVG | svgwrite |
| PNG | CairoSVG (primary), Pillow (fallback) |

---

# Repository Structure

```text
backend/          Python backend — API, engines, models
frontend/         React + TypeScript frontend
tests/            Pytest test suite
fonts/            Repo-local Etch N Shine production font library
docs/
  adr/            Architecture Decision Records
  architecture/   Architecture design documents
  business/       Business requirements
  governance/     Delivery plan, testing strategy, master prompt
  handoffs/       Phase implementation plans and completion reports
  phases/         Phase scope documents
  product/        Product backlog
exports/          Generated files (gitignored)
logs/             Application logs (gitignored)
```

---

# Key Documentation

| Document | Purpose |
|---|---|
| [docs/governance/CODING_AGENT_MASTER_PROMPT.md](docs/governance/CODING_AGENT_MASTER_PROMPT.md) | Master operating rules for all development agents |
| [docs/governance/PHASED_DELIVERY_PLAN.md](docs/governance/PHASED_DELIVERY_PLAN.md) | Full phase roadmap |
| [docs/phases/PHASE_INDEX.md](docs/phases/PHASE_INDEX.md) | Phase filename mapping and status |
| [docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md](docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md) | Architecture decisions |
| [docs/handoffs/phase-1c-completion-report.md](docs/handoffs/phase-1c-completion-report.md) | Phase 1C completion report |
| [docs/handoffs/phase-1c-lightburn-validation.md](docs/handoffs/phase-1c-lightburn-validation.md) | LightBurn validation evidence |
| [docs/phases/PHASE_X_OVERLAP_ENGINE_IMPLEMENTATION.md](docs/phases/PHASE_X_OVERLAP_ENGINE_IMPLEMENTATION.md) | Phase X Overlap Engine plan |
| [docs/phases/CAKE_TOPPER_FEATURE_SPECIFICATION.md](docs/phases/CAKE_TOPPER_FEATURE_SPECIFICATION.md) | Cake Topper feature specification (business + technical) |

---

# Development Workflow

1. Review documentation.
2. Create implementation plan.
3. Obtain approval.
4. Implement approved scope only.
5. Execute testing.
6. Update documentation.
7. Update handoff.
8. Commit changes.
9. Tag release.

---

# End of Document
