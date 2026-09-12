---
name: analyze-issue
description: Analyze a che-dashboard GitHub issue — reproduce the context, identify affected packages and files, map the fix scope. Use before implementing any fix.
argument-hint: "[issue-number or issue-URL]"
---

# Analyze che-dashboard Issue

## Required input

An issue number or URL. If `$ARGUMENTS` is empty, ask the user for the issue number.

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo eclipse-che/che-dashboard \
  --json number,title,body,labels,assignees,comments,state
```

If the issue is closed or already has an assignee, stop and report — do not proceed.

Check labels against forbidden list (`wontfix`, `duplicate`, `stale`, `needs-triage`). Stop if any match.

### 2. Parse the issue

Extract from the body:
- **Steps to reproduce** — exact sequence
- **Expected behavior** — what should happen
- **Actual behavior** — what happens instead
- **Component hint** — any mentioned component name, route, or feature area

### 3. Classify the affected package

| Symptom | Package |
|---|---|
| UI rendering, component, CSS, PatternFly | `dashboard-frontend` |
| Redux state, selector, store action | `dashboard-frontend` → `store/reducers/` |
| API call from frontend to backend | `dashboard-frontend/services/` + backend route |
| Backend proxy route, k8s API call | `dashboard-backend` |
| Shared types, DTOs | `common` |
| Factory / Devfile parsing | `dashboard-frontend/services/devfile*` + devworkspace-generator |

### 4. Find affected files

```bash
# Search for the component or feature mentioned in the issue
cd "$LOCAL_PATH"

# By component name
grep -r "ComponentName" packages/ --include="*.ts" --include="*.tsx" -l

# By API route
grep -r "/api/endpoint" packages/ --include="*.ts" -l

# By Redux slice name
grep -r "sliceName" packages/dashboard-frontend/src/store/ -l
```

List all files that will likely need changes. Include their `*.spec.ts` test files.

### 5. Check test coverage

For each identified file, verify a corresponding spec file exists:

```bash
ls packages/dashboard-frontend/src/components/<ComponentName>/__tests__/
# or
ls packages/dashboard-frontend/src/store/reducers/__tests__/
```

If no spec exists, note it — a new spec must be created as part of the fix.

### 6. Reproduce the issue

**Frontend issue:**
```bash
yarn start
# Navigate to the relevant page in browser at http://localhost:8080
# Confirm the bug is reproducible
```

**Backend / unit test issue:**
```bash
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="<route-name>" --no-cache
# or
yarn workspace @eclipse-che/dashboard-frontend test --testPathPatterns="<ComponentName>" --no-cache
```

### 7. Estimate story points

Apply the assign-story-points skill:
- 1: typo, single config value, trivial CSS fix
- 2: one component change + minor test update
- 3: component + Redux slice + test cases
- 5: cross-package (frontend + backend + common) + significant tests
- 8: architecture change, multiple packages, broad test impact

## Output

Report in this format:

```
## Issue Analysis: #NNNN — <title>

**Package:** dashboard-frontend / dashboard-backend / common
**Component/Feature:** <name>
**Type:** bug / enhancement / CVE / test-coverage

**Affected files:**
- packages/dashboard-frontend/src/components/Foo/index.tsx
- packages/dashboard-frontend/src/components/Foo/__tests__/index.spec.tsx (needs creation)
- packages/dashboard-frontend/src/store/reducers/foo.ts

**Root cause hypothesis:** <what is broken and why>

**Fix scope:** <what needs to change>

**Story points:** 2

**Ready to implement:** yes / no (reason if no)
```
