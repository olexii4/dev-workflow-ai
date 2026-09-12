---
name: review-pr
description: Review a dash-licenses PR against Java/Maven conventions. Reports findings by severity.
argument-hint: "[PR-number or PR-URL]"
---

# Review dash-licenses PR

## Required input

A PR number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the PR diff

```bash
PR_NUM=<parse from $ARGUMENTS>
gh pr diff ${PR_NUM} --repo che-incubator/dash-licenses
gh pr view ${PR_NUM} --repo che-incubator/dash-licenses --json title,body,files
```

### 2. Tier 1 — Always check

#### EPL-2.0 header in new .java files (BLOCKING)

```bash
gh api repos/che-incubator/dash-licenses/pulls/${PR_NUM}/files \
  --jq '.[] | select(.status == "added") | .filename' | grep "\.java$"
```

For each new Java file, fetch it and verify the EPL-2.0 header block. Missing = **BLOCKING**.

#### No wildcard imports (BLOCKING)

```bash
gh pr diff ${PR_NUM} --repo che-incubator/dash-licenses | grep "^\+" | grep -E "^import .+\.\*;"
```

Any `import com.foo.*;` = **BLOCKING**.

#### Checkstyle passes (BLOCKING)

The PR CI must run `mvn checkstyle:check`. If CI fails on checkstyle, it is a **BLOCKING** violation. Flag any obvious checkstyle issues visible in the diff (line length, brace style) as **ADVISORY** preemptively.

#### Test present for changed logic (ADVISORY)

For each changed `.java` file (not `*Test.java`), check if a corresponding `*Test.java` was also changed. New logic without test = **ADVISORY** (BLOCKING if new registry integration class).

### 3. Tier 2 — Trigger-based checks

#### New registry integration added

If a new fetcher class for a package registry is added:
- Check error handling for HTTP failures (network timeout, 404, auth error)
- Check the registry is reachable from CI (no corporate-only internal registry)
- Test class must cover both successful resolution and failure cases

#### pom.xml dependency changed

If a new dependency is added to `pom.xml`:
- Check the dependency license is compatible with EPL-2.0
- Check it's not a GPL/AGPL/LGPL-only library (incompatible with EPL-2.0)

## Output

```
## PR Review: #NNNN — <title>

| # | File | Finding | Severity |
|---|---|---|---|
| 1 | src/main/java/org/.../Fetcher.java | Missing EPL-2.0 header | BLOCKING |
| 2 | src/main/java/org/.../Fetcher.java | Wildcard import: `import com.foo.*` | BLOCKING |
| 3 | src/main/java/org/.../Fetcher.java | No test for error path | ADVISORY |

**Blocking issues:** N
**Advisory issues:** N
```
