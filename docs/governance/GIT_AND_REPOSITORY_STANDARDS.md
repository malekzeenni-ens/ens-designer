# GIT_AND_REPOSITORY_STANDARDS.md

## Purpose

This document defines source control standards for the AI SVG Generator project.

It ensures consistency across:

- Claude Code
- Codex
- Future contributors

---

# Repository Principles

1. Main branch must remain stable.
2. Every change must be traceable.
3. Every change must be documented.
4. Every release must be reproducible.
5. Every phase must have a handoff record.

---

# Branch Strategy

## Main

Production-ready code only.

---

## Feature Branches

Examples:

feature/phase-01-welded-text

feature/phase-02-structural-intelligence

feature/phase-03-cake-topper

---

## Hotfix Branches

Examples:

hotfix/svg-export

hotfix/font-loading

---

# Commit Standards

Commit messages should be concise and meaningful.

Examples:

feat: phase 01 welded text generator

feat: add structural validation scoring

fix: resolve svg export scaling issue

docs: update architecture documentation

test: add integration tests for export engine

---

# Pull Request Standards

Every pull request should include:

- Scope summary
- Files changed
- Risks
- Testing evidence
- Documentation updates

---

# Required Documentation Updates

Before merging:

- Relevant architecture documents updated
- Relevant phase documents updated
- Handoff documentation updated
- Changelog updated

---

# Tagging Strategy

Examples:

v0.1.0

v0.2.0

v0.3.0

v0.4.0

v0.5.0

v1.0.0

---

# Recommended .gitignore

```text
node_modules
.env
.env.*
dist
build
coverage
.next
.cache
.shopify
.vscode
.idea
.DS_Store
*.log
```

---

# Merge Requirements

Before merging:

- Tests pass
- Documentation updated
- Handoff updated
- No critical defects

---

# End of Document
