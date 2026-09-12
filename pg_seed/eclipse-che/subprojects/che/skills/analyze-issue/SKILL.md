---
name: analyze-issue
description: Analyze an eclipse-che/che GitHub issue — CI/CD, release automation, E2E tests, or cross-repo coordination. Identifies affected area and fix scope.
argument-hint: "[issue-number]"
---

# Analyze eclipse-che/che Issue

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo eclipse-che/che \
  --json number,title,body,labels,assignees,state,comments
```

Stop if: closed, already assigned, or has forbidden labels (`wontfix`, `duplicate`, `stale`, `needs-triage`). Skip `[Validate]` title issues.

### 2. Classify the area

| Symptom | Area |
|---|---|
| GitHub Actions workflow failing | `.github/workflows/` |
| Release automation, version bumps | `make-release.sh`, `.github/workflows/release*.yml` |
| E2E test failing or flaky | `tests/e2e/` |
| Devfile sample broken | `devfiles/` |
| Cross-repo issue tracker, docs | `README.md`, `docs/` |
| CRE script, operator automation | `cre/` |

### 3. Find affected files

```bash
cd "$LOCAL_PATH"

# GitHub Actions workflows
ls .github/workflows/ | grep -i <keyword>

# E2E tests
grep -r "testName\|SuiteName" tests/e2e/ --include="*.ts" -l

# Shell scripts
grep -r "functionName\|keyword" *.sh -l
```

### 4. Estimate story points

- 1: single workflow step fix, env var, typo
- 2: one workflow file or one test spec
- 3: cross-workflow change or multiple test specs
- 5: new workflow, new E2E test suite
- 8: release process overhaul

## Output

```
## Issue Analysis: #NNNN — <title>

**Area:** GitHub Actions / E2E tests / Release / Devfiles
**Type:** bug / enhancement / flaky-test / docs

**Affected files:**
- .github/workflows/build.yml
- tests/e2e/specs/foo.spec.ts

**Root cause hypothesis:** <what is broken>
**Fix scope:** <what to change>
**Story points:** 2
**Ready to implement:** yes
```
