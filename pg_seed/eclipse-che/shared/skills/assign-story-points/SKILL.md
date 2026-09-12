---
name: assign-story-points
description: Estimate story points (1/2/3/5/8) for an issue based on scope heuristics. Use after analyze-issue or as part of filter-issues scoring.
argument-hint: "[issue-number or issue context]"
---

# Assign Story Points

## Required input

Either:
- An issue number (will fetch the issue and analyze-issue output if available), or
- The analyze-issue output already in context (file count, scope description)

## Scoring Heuristics

### Score = 1 (Trivial)

Single file change, no test changes needed:
- Typo in UI text or error message
- Single config value change
- Version bump in a Dockerfile
- CSS color/spacing fix to a single rule

### Score = 2 (Small)

1–3 files, minor test update:
- Fix a bug in one component with an existing test (just update the test)
- Add a missing null check
- Fix a Redux selector returning wrong value
- Update one API field name

### Score = 3 (Medium)

3–8 files, new test cases required:
- Fix a bug that spans a component + its Redux slice + API service
- Add a new UI element to an existing page
- Fix a backend route and add tests
- Update a Devfile component mapping in devworkspace-generator

### Score = 5 (Large)

Cross-package change, significant test coverage:
- New feature spanning frontend + backend
- API shape change affecting both packages/common and packages/dashboard-frontend
- Cross-module change in che-server (service + REST layer + test)
- New controller behavior in devworkspace-operator

### Score = 8 (Complex)

Architecture-level change, multiple packages, broad test suite impact:
- New Redux slice with full test coverage
- New backend service with k8s API integration
- New CRD type in devworkspace-operator
- Multi-repo coordinated change

---

## Special Cases

- **Doc-only changes** (che-docs): always cap at **1** regardless of file count
- **Dependency CVE bump**: 1–2 depending on whether `.deps/` regeneration is needed
- **Test coverage gap** (adding missing tests only): 1–2

---

## Decision Process

1. Count the affected files from `analyze-issue` output
2. Check if the fix crosses package boundaries
3. Check if new test files need to be created (not just updated)
4. Apply the score table above
5. If uncertain between two scores, pick the lower one — avoid over-estimating

## Output

```
**Story points: 2**

Rationale: Fix touches 2 files (component + spec), no cross-package changes, existing test patterns apply.
```
