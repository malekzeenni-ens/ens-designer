# connectivity-engine-architecture-remediation.md

## Document Information

Project: AI SVG Generator
Business: Etch 'N' Shine
Date: 2026-05-30
Document Type: Architecture Remediation Summary
Status: Complete

---

# 1. Documentation Change Summary

The documentation has been remediated to clarify that the product is a Connectivity Resolution Engine, not primarily a bridge generation engine.

The approved behaviour is:

1. Preserve natural connectivity when the selected font or design is already connected.
2. Apply intelligent letter compression when disconnected text can become connected through spacing, overlap, and union.
3. Use structural bridges only as a fallback when natural connectivity and compression fail.

This remediation does not introduce application code, new product scope, or a new phase.

---

# 2. Files Updated

- /README.md
- /docs/business/BUSINESS_CONTEXT.md
- /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md
- /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
- /docs/architecture/TECHNICAL_SOLUTION_DESIGN.md
- /docs/architecture/README_ARCHITECTURE_OVERVIEW.md
- /docs/architecture/FONT_PROCESSING_AND_GEOMETRY_ENGINE_DESIGN.md
- /docs/architecture/WELDING_AND_BRIDGING_ENGINE_DESIGN.md
- /docs/architecture/MATERIAL_PROFILE_ENGINE_DESIGN.md
- /docs/architecture/RECOMMENDATION_ENGINE_DESIGN.md
- /docs/adr/ADR-002-GEOMETRY-KERNEL.md
- /docs/adr/ADR-004-MATERIAL-VALIDATION-STRATEGY.md
- /docs/governance/CODING_AGENT_MASTER_PROMPT.md
- /docs/governance/PHASED_DELIVERY_PLAN.md
- /docs/governance/TESTING_AND_QA_STRATEGY.md
- /docs/phases/PHASE_02_ADVANCED_STRUCTURAL_INTELLIGENCE_IMPLEMENTATION.md
- /docs/phases/PHASE_INDEX.md
- /docs/product/PRODUCT_BACKLOG_AND_FUTURE_ENHANCEMENTS.md
- /docs/handoffs/architecture-freeze-summary.md
- /docs/handoffs/phase-1b-implementation-plan.md

---

# 3. Architecture Changes

The architecture now defines a Connectivity Resolution Engine with this processing order:

```text
Connectivity Analysis
-> Natural Connectivity
-> Intelligent Letter Compression
-> Geometry Union
-> Structural Bridge Fallback
-> Connected Output
```

Bridges are explicitly fallback geometry. They are not the primary strategy and must not be generated when natural connectivity or compression can produce a valid connected structure.

---

# 4. Terminology Changes

Recommended and applied primary term:

Connectivity Resolution Engine

Reason:

It describes the full decision process and avoids over-emphasising welding or bridges.

Allowed internal operation terms:

- Connectivity analysis
- Natural connectivity
- Letter compression
- Geometry union
- Structural bridge fallback
- Material validation

Terms demoted from primary architecture terminology:

- Welding Engine
- Bridge Engine
- Bridge Generation Engine

---

# 5. Roadmap Changes

No new phases were added.

Phase 1B is now documented as:

Connectivity Resolution & Validation

Scope remains deterministic and local-first:

- Natural connectivity preservation
- Intelligent letter compression
- Geometry union
- Structural bridge fallback
- Connectivity validation
- Material validation

Phase 1C still contains production hardening, golden test corpus, LightBurn validation evidence, and manual bridge override.

---

# 6. Testing Changes

The test strategy now includes connectivity examples:

Already connected:

- Pacifico
- Peanut Butter
- Script fonts

Compression required:

- Anton
- Oswald

Bridge required:

- Lobster leading character example
- Happy Birthday
- Multi-word layouts

Testing must verify that bridges are not created before natural connectivity and compression have been attempted.

---

# 7. Risks Identified

| Risk | Severity | Mitigation |
|---|---|---|
| Existing Phase 1B implementation/handoff language may still reflect bridge-first assumptions. | High | Treat this remediation as the governing architecture baseline for future acceptance and rework. |
| Compression can harm visual quality if applied too aggressively. | High | Add visible limits, scoring, and warnings before accepting output as production-ready. |
| Script fonts may be naturally connected visually but still produce multiple outline components due to decorative dots or swashes. | Medium | Connectivity analysis must distinguish required connectivity from intentional standalone details. |
| Bridge fallback may still be needed for multi-word and multi-line layouts. | Medium | Keep bridges available as fallback and add manual override in Phase 1C. |

---

# 8. Recommendation

Phase 1A:

GO

Reason:

Phase 1A remains a deterministic text-to-vector foundation and does not need to solve connectivity.

Phase 1B and later:

GO WITH CONDITIONS

Condition:

Future Phase 1B acceptance must be judged against the Connectivity Resolution Engine behaviour, not bridge-first output. Bridges must be treated as fallback after natural connectivity and letter compression.

---

# Stop Condition

Documentation remediation is complete.

Do not start Phase 1A or Phase 1B implementation from this document alone. Wait for explicit approval.

