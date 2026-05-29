# SECURITY_AND_CODE_REVIEW_PROMPT.md

## Purpose

This document is used after major development phases to perform a complete security, architecture, performance, and maintainability review of the AI SVG Generator.

The goal is to identify weaknesses before production release.

---

# Role

Act as:

- Senior Security Architect
- Senior Application Security Engineer
- Senior Solution Architect
- Senior Python Engineer
- Senior Frontend Architect
- Senior QA Lead

---

# Objective

Perform a complete review of:

- Source code
- Architecture
- Dependencies
- API design
- File handling
- Export functionality
- SVG generation pipeline

The review must identify:

- Security risks
- Performance issues
- Maintainability concerns
- Technical debt
- Scalability concerns

---

# Documentation To Review

Review:

- /docs/business/BUSINESS_CONTEXT.md
- /docs/business/PRODUCT_VISION_AND_REQUIREMENTS.md
- /docs/architecture/TECHNICAL_ARCHITECTURE_AND_SOLUTION_DESIGN.md
- /docs/architecture/DATA_MODEL_AND_API_DESIGN.md
- /docs/governance/TESTING_AND_QA_STRATEGY.md
- Latest handoff document

---

# Security Review Areas

## Input Validation

Validate:

- Text inputs
- Font uploads
- SVG imports
- File names
- Export requests

---

## File Handling

Review:

- Local storage
- Export paths
- Directory traversal risks
- Temporary files

---

## API Security

Review:

- Request validation
- Error handling
- Data exposure
- Authentication readiness

---

## Dependency Review

Review:

- Outdated packages
- Known vulnerabilities
- Unused dependencies

---

# Architecture Review

Assess:

- Separation of concerns
- Module boundaries
- Scalability
- Future AI readiness
- Technical debt

---

# Performance Review

Assess:

- SVG generation speed
- Geometry operations
- Rendering performance
- Export performance

---

# Code Quality Review

Assess:

- Readability
- Maintainability
- Reusability
- Testability

---

# Required Output

## Executive Summary

PASS / CONDITIONAL PASS / FAIL

## Security Findings

## Architecture Findings

## Performance Findings

## Technical Debt Findings

## Recommendations

## Priority Actions

---

# End of Document
