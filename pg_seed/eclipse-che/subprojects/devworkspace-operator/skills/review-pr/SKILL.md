---
name: review-pr
description: Review a devworkspace-operator PR against Go/Operator SDK patterns. Reports findings by severity.
argument-hint: "[PR-number or PR-URL]"
---

# Review devworkspace-operator PR

## Required input

A PR number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the PR diff

```bash
PR_NUM=<parse from $ARGUMENTS>
gh pr diff ${PR_NUM} --repo devfile/devworkspace-operator
gh pr view ${PR_NUM} --repo devfile/devworkspace-operator --json title,body,files,additions,deletions
```

### 2. Tier 1 — Always check

#### All errors checked (BLOCKING)

```bash
gh pr diff ${PR_NUM} --repo devfile/devworkspace-operator | grep "^\+" | grep -E "^\+\s+_\s*,\s*err\s*:?="
```

Also scan for `_ = someFunc()` patterns that discard errors. Any unchecked error = **BLOCKING**.

#### context.Context propagated (BLOCKING)

For any added function that performs I/O (k8s client calls, file ops, HTTP), verify it accepts `ctx context.Context` as first parameter and passes it through. Missing context propagation = **BLOCKING**.

#### Deferred cleanup on error paths (BLOCKING)

Scan added code for resource creation (`Create`, `Open`, `Start`) without corresponding `defer` cleanup. Cleanup only on happy path = **BLOCKING**.

#### No goroutine leaks (BLOCKING)

Scan for `go func()` in added code. Verify each goroutine has a clear termination: channel close, context cancel, or WaitGroup. Unbounded goroutine = **BLOCKING**.

#### EPL-2.0 header in new .go files (BLOCKING)

```bash
gh api repos/devfile/devworkspace-operator/pulls/${PR_NUM}/files \
  --jq '.[] | select(.status == "added") | .filename' | grep "\.go$"
```

Fetch each new file and verify the EPL-2.0 header comment block. Missing = **BLOCKING**.

#### Unit tests for changed controller logic (ADVISORY)

For each changed `*_reconciler.go` or controller file, check if a corresponding `*_test.go` was also changed or added. Significant logic change without tests = **ADVISORY**.

### 3. Tier 2 — Trigger-based checks

#### Status conditions updated (`Status.Conditions`, `SetCondition`)

If triggered, verify every condition write sets all four fields:
- `Type` — matches a defined constant
- `Status` — `corev1.ConditionTrue/False/Unknown`
- `Reason` — short CamelCase string
- `Message` — human-readable explanation

Missing any field = **ADVISORY**.

#### Finalizer added or removed (`controllerutil.AddFinalizer`, `RemoveFinalizer`)

Verify:
- Finalizer is added before the resource is considered "owned"
- Finalizer is removed only after cleanup is complete
- Cleanup handles 404 (resource already gone) gracefully

#### New watch predicate added

Verify predicate correctly filters events — overly broad predicates cause excessive reconcile load.

#### CRD schema changed (field added to `apis/controller/v1alpha1/`)

- New required field without default = **BLOCKING** (breaks existing CRs)
- `make generate` and `make bundle` must be included in the PR
- Check backward compatibility: optional fields should use pointer types (`*string`, not `string`)

#### New event recorded (`recorder.Event`, `recorder.Eventf`)

Events should fire only on meaningful transitions (phase change, error encountered), not on every reconcile tick. Check call site is gated by a condition change.

## Output

```
## PR Review: #NNNN — <title>

| # | File | Finding | Severity |
|---|---|---|---|
| 1 | controllers/workspace/reconciler.go | Error discarded with `_` | BLOCKING |
| 2 | apis/v1alpha1/devworkspace_types.go | New required field without default | BLOCKING |
| 3 | controllers/workspace/reconciler_test.go | No test for new reconcile branch | ADVISORY |

**Blocking issues:** N — must fix before merge.
**Advisory issues:** N — fix recommended.
```
