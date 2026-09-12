---
name: analyze-issue
description: Analyze a devworkspace-operator GitHub issue. Maps to Go controller, CRD type, or reconcile loop. Identifies affected files and fix scope.
argument-hint: "[issue-number]"
---

# Analyze devworkspace-operator Issue

## Required input

An issue number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo devfile/devworkspace-operator \
  --json number,title,body,labels,assignees,comments,state
```

Check labels against forbidden list (`lifecycle/stale`, `wontfix`, `duplicate`). Stop if any match.

### 2. Identify the area

Map issue symptoms to source directories:

| Symptom | Directory |
|---|---|
| Workspace not starting / stuck in phase | `controllers/workspace/` |
| Routing / endpoint exposure | `controllers/controller/devworkspacerouting/` |
| Backup / restore failing | `controllers/backupcronjob/`, `controllers/workspace/internal/` |
| CRD field missing or incorrect | `apis/controller/v1alpha1/` |
| Status condition wrong | `controllers/workspace/` — status update logic |
| Metrics not emitted | `controllers/workspace/metrics/` |
| Operator RBAC | `deploy/bundle/manifests/` |

### 3. Find affected Go files

```bash
cd "$LOCAL_PATH"

# Search for the type or function mentioned in the issue
grep -r "ErrorMessage\|FunctionName\|TypeName" controllers/ apis/ --include="*.go" -l

# For status condition issues
grep -r "ConditionType\|SetCondition\|AddCondition" controllers/ --include="*.go" -l
```

### 4. Determine if CRD schema changes are needed

If the issue requires a new field in `apis/controller/v1alpha1/`:
- The fix needs `make generate` to update deepcopy methods
- The fix needs `make bundle` to update OLM manifests
- Set story points ≥ 3

### 5. Estimate story points

- **1**: single function fix, no schema change, no new test file needed
- **2**: controller logic fix, minor test update in existing test file
- **3**: new CRD field, new controller behavior, or significant new test cases
- **5**: cross-controller change, new reconcile step, or new CRD type

### 6. Check existing tests

```bash
ls controllers/workspace/
# Most controllers have _test.go files alongside them
grep -r "TestFunctionName" controllers/ --include="*_test.go" -l
```

Note which test files cover the affected area.

## Output

```
## Issue Analysis: #NNNN — <title>

**Area:** controller/workspace / devworkspacerouting / backup / CRD
**Type:** bug / enhancement / CRD schema change
**CRD schema change required:** yes / no

**Affected files:**
- controllers/workspace/reconciler.go
- controllers/workspace/reconciler_test.go

**Root cause hypothesis:** <what is broken and why>

**Fix scope:** <what needs to change>

**Story points:** 2

**IMPLEMENT_READY: devfile/devworkspace-operator#NNNN**
```
