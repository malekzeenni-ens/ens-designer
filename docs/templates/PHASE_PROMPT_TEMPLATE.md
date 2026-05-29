# PHASE_PROMPT_TEMPLATE.md

## Purpose

This template is used to execute a single development phase of the AI SVG Generator project.

It is intended for Claude Code, Codex, or any future coding agent.

Each phase should be executed independently.

The coding agent must stop after completing the phase and wait for approval before continuing.

---

# Phase Information

Phase Number:

{{PHASE_NUMBER}}

Phase Name:

{{PHASE_NAME}}

Version:

{{TARGET_VERSION}}

---

# Context

Before starting work review the following documents:

- /docs/business/BUSINESS_CONTEXT.md
- /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md
- /docs/business/FUNCTIONAL_SPECIFICATION_DOCUMENT_TEMPLATE.md
- /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
- /docs/governance/PHASED_DELIVERY_PLAN.md
- /docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md
- /docs/governance/TESTING_AND_QA_STRATEGY.md

---

# Role

Act as:

- Senior Solution Architect
- Senior Software Engineer
- Senior QA Engineer
- Senior UX Engineer

---

# Phase Objective

{{PHASE_OBJECTIVE}}

---

# Scope

## Included

{{PHASE_SCOPE_INCLUDED}}

---

## Excluded

{{PHASE_SCOPE_EXCLUDED}}

Do not implement anything outside this scope.

---

# Required Deliverables

- Production-ready code
- Automated tests
- Updated documentation
- Updated handoff document
- Git commit recommendations

---

# Implementation Process

## Step 1

Review documentation.

---

## Step 2

Create implementation plan.

Include:

- Files to create
- Files to modify
- Risks
- Dependencies

---

## Step 3

Pause.

Present plan.

Wait for approval.

---

## Step 4

Implement approved scope.

---

## Step 5

Execute testing.

Required:

- Unit testing
- Integration testing
- Manual testing

---

## Step 6

Update documentation.

---

## Step 7

Update handoff.

Create or update:

/docs/handoffs/{{HANDOFF_FILE}}

---

## Step 8

Provide release summary.

---

# Acceptance Criteria

{{ACCEPTANCE_CRITERIA}}

---

# Testing Requirements

The coding agent must provide:

- Tests executed
- Results
- Failures discovered
- Fixes applied

---

# Documentation Requirements

Update all impacted documents.

Do not leave documentation outdated.

---

# Handoff Requirements

Must follow:

/docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md

---

# Final Output

Provide:

1. Summary of completed work
2. Files created
3. Files modified
4. Test results
5. Risks
6. Recommended commit message
7. Recommended release tag

---

# Stop Condition

After completing this phase:

STOP

Do not continue into the next phase.

Wait for approval.

---

# End of Document
