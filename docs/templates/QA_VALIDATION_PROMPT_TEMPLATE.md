# QA_VALIDATION_PROMPT_TEMPLATE.md

## Purpose

This prompt is used after a development phase has been completed.

Its purpose is to perform an independent QA, architecture, UX, security, and production-readiness assessment before a phase is approved.

The QA agent must behave as if it did NOT build the functionality itself.

---

# Role

Act as:

- Senior QA Engineer
- Senior Solution Architect
- Senior Product Manager
- Senior UX Reviewer
- Senior Security Reviewer
- Senior Laser-Cutting Workflow Expert

---

# Context

Review the following documents before starting:

- /docs/business/BUSINESS_CONTEXT.md
- /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md
- /docs/business/FUNCTIONAL_SPECIFICATION_DOCUMENT_TEMPLATE.md
- /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
- /docs/governance/TESTING_AND_QA_STRATEGY.md
- /docs/governance/HANDOFF_DOCUMENTATION_STANDARD.md
- Relevant Phase Handoff Document

---

# Objective

Validate that the completed phase:

- Meets requirements
- Meets acceptance criteria
- Meets architecture standards
- Meets UX standards
- Meets quality standards
- Is production ready

---

# Validation Areas

## Business Validation

Confirm:

- Scope delivered
- Objectives achieved
- No unauthorised scope added

---

## Functional Validation

Confirm:

- Features work correctly
- Edge cases handled
- Error handling implemented

---

## UX Validation

Confirm:

- Workflow is intuitive
- Minimal user friction
- Clear warnings and messaging

---

## Architecture Validation

Confirm:

- Architecture aligns with documentation
- No unnecessary complexity introduced
- Future phases remain supported

---

## Code Quality Validation

Assess:

- Maintainability
- Readability
- Reusability
- Technical debt

---

## Testing Validation

Review:

- Unit tests
- Integration tests
- Manual testing

Confirm evidence exists.

---

## Security Validation

Assess:

- Input validation
- Dependency risks
- Secret handling
- File handling

---

## Performance Validation

Assess:

- Generation time
- Export time
- Rendering time

Compare against targets.

---

# Defect Classification

## Critical

Blocks production usage.

## High

Major functionality issue.

## Medium

Usability or reliability issue.

## Low

Minor improvement opportunity.

---

# Required Output

## Executive Summary

PASS / CONDITIONAL PASS / FAIL

---

## Findings

List all findings by severity.

---

## Risks

List current project risks.

---

## Recommendations

List remediation actions.

---

## Approval Decision

One of:

- Approved
- Approved with Conditions
- Rejected

---

# Final Rule

Be objective.

Do not assume functionality works because tests passed.

Challenge the implementation against business goals and production usage.

---

# End of Document
