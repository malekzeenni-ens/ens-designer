# BUSINESS_REQUIREMENTS_DOCUMENT_TEMPLATE.md

## Document Information

Version: 1.0
Status: Draft
Document Type: Business Requirements Document (BRD)
Project: AI SVG Generator
Owner: Etch 'N' Shine

---

# Executive Summary

The AI SVG Generator is a laser-focused design generation platform intended to reduce the time, effort, and expertise required to create production-ready SVG files for laser cutting.

The platform will automate traditionally manual design tasks including:

- Text welding
- Letter connection
- Bridge generation
- Structural validation
- SVG export

The platform will evolve through multiple phases into an AI-powered laser design studio.

---

# Problem Statement

Current laser design workflows require multiple manual steps:

1. Font selection
2. Text creation
3. Vector conversion
4. Letter welding
5. Bridge creation
6. Structural validation
7. SVG export

These activities:

- Consume production time
- Increase human error
- Require specialist software knowledge
- Create scalability challenges

The business requires an automated solution capable of generating production-ready SVG files.

---

# Business Objectives

## Objective 1

Reduce artwork preparation time.

Target:

Reduce design preparation effort by at least 70%.

---

## Objective 2

Increase production capacity.

Target:

Allow significantly more designs to be produced daily.

---

## Objective 3

Improve design consistency.

Target:

Standardise output quality across all generated designs.

---

## Objective 4

Reduce production failures.

Target:

Increase first-pass cutting success rate above 95%.

---

## Objective 5

Create a foundation for AI-powered design generation.

Target:

Support future AI-assisted artwork generation without architectural redesign.

---

# Business Scope

## In Scope (Phase 1A)

### Core Text Generation

Features:

- Name input
- Font selection
- Unicode normalisation
- HarfBuzz text shaping
- Font outline extraction
- Canonical geometry creation
- SVG export
- PNG export
- Design preview

---

## In Scope (Phase 1B)

### Welding & Validation

Features:

- Automatic letter welding
- Automatic bridge creation
- Connectivity validation
- Geometry validation
- Material validation for 3mm Cast Acrylic, 3mm Mirror Acrylic, and 3mm Plywood

---

## In Scope (Phase 1C)

### Production Hardening

Features:

- Golden test corpus
- LightBurn validation process
- Manual bridge override
- Production presets

---

## Out of Scope (Phase 1)

- Cake topper generation
- AI image generation
- Multi-layer SVG generation
- Shopify integration
- Etsy integration
- Cloud deployment
- Laser machine control

---

# Stakeholders

## Primary Stakeholder

Etch 'N' Shine

Responsibilities:

- Product ownership
- Requirement approval
- User acceptance testing

---

## Secondary Stakeholders

Future:

- Production operators
- Designers
- Commercial users

---

# Success Metrics

| Metric | Target |
|----------|----------|
| SVG Generation Time | <30 Seconds |
| First-Time Cut Success | >95% |
| Manual Editing Required | <20% |
| User Satisfaction | >90% |
| Production Time Reduction | >70% |

---

# Assumptions

1. Users own laser cutting equipment.

2. Users understand basic SVG workflows.

3. Fonts are legally licensed.

4. LightBurn remains a primary workflow tool.

5. Most generated designs are personalised names.

---

# Constraints

## Technical Constraints

- Local-first architecture
- Windows support
- SVG output
- PNG output

---

## Operational Constraints

- Minimal user training
- Fast generation times
- Offline-friendly workflow

---

# Risks

## Risk 1

Certain fonts may not produce reliable welds.

Mitigation:

Automatic bridge generation.

---

## Risk 2

Generated designs may be structurally weak.

Mitigation:

Structural validation engine.

---

## Risk 3

Complex fonts may create geometry errors.

Mitigation:

Geometry repair workflow.

---

## Risk 4

Future AI capabilities may increase complexity.

Mitigation:

Modular architecture.

---

# Future Business Roadmap

## Phase 2

Cake Topper Generator

---

## Phase 3

SVG Import & Repair

---

## Phase 4

Decorative Library

---

## Phase 5

AI Graphic Generator

---

## Phase 6

AI Design Studio

---

# Approval Criteria

The project may proceed when:

- Discovery complete
- Scope approved
- Risks accepted
- Success metrics agreed

---

# End of Document
