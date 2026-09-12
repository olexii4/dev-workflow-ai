---
name: review-pr
description: Review a che-server PR diff against Java/Maven coding standards. Reports findings grouped by severity.
argument-hint: "[PR-number or PR-URL]"
---

# Review che-server PR

## Required input

A PR number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the PR diff

```bash
PR_NUM=<parse from $ARGUMENTS>
gh pr diff ${PR_NUM} --repo eclipse-che/che-server
gh pr view ${PR_NUM} --repo eclipse-che/che-server --json title,body,files,additions,deletions,labels
```

### 2. Tier 1 — Always check (BLOCKING unless noted)

#### EPL-2.0 header in new .java files

```bash
gh api repos/eclipse-che/che-server/pulls/${PR_NUM}/files \
  --jq '.[] | select(.status == "added") | .filename' | grep "\.java$"
```

For each new Java file: fetch it and verify the EPL-2.0 header block is present. Missing header = **BLOCKING**.

#### No wildcard imports

```bash
gh pr diff ${PR_NUM} --repo eclipse-che/che-server | grep "^\+" | grep -E "^import .+\.\*;"
```

Any `import com.foo.*;` in added lines = **BLOCKING**.

#### No hardcoded credentials or tokens

```bash
gh pr diff ${PR_NUM} --repo eclipse-che/che-server | grep "^\+" | grep -iE "(password|token|secret|apikey)\s*=\s*['\"][^$]"
```

Hardcoded secrets = **BLOCKING**.

#### @Inject for injectable components

Search added lines for `new <ClassName>(` where the class is a service/repository. Constructor injection with `@Inject` is the correct pattern. Bare `new` for injectable components = **BLOCKING**.

#### Test present for changed logic (ADVISORY)

```bash
gh api repos/eclipse-che/che-server/pulls/${PR_NUM}/files \
  --jq '.[].filename' | grep -v "Test\.java\|\.xml\|\.md"
```

For each changed non-test Java file, check if a corresponding `*Test.java` was also changed or added. New logic without new tests = **ADVISORY** (BLOCKING if a new class with no existing test).

### 3. Tier 2 — Trigger-based checks

#### REST endpoint changed (`@Path`, `@GET`, `@POST`, `@PUT`, `@DELETE`)

```bash
gh pr diff ${PR_NUM} --repo eclipse-che/che-server | grep "^\+" | grep -E "@(GET|POST|PUT|DELETE|Path)"
```

If triggered, check:
- Auth guard present: `@RolesAllowed` or equivalent annotation
- Input validation: method parameters validated before use
- Error response format: consistent with existing API (returns typed error body)

#### Kubernetes API call changed

If `KubernetesClient`, `CoreV1Api`, or `CustomObjectsApi` usage changed:
- Check error handling: `ApiException` caught and converted to domain exception
- Check resource cleanup: created resources have corresponding delete on error path

#### OAuth code changed

If `OAuthAuthenticator`, `OAuthToken`, or OAuth-related classes changed:
- Check token validation logic
- Check scope verification
- Verify no token is logged at info/debug level

## Output

```
## PR Review: #NNNN — <title>

| # | File | Finding | Severity |
|---|---|---|---|
| 1 | src/.../Foo.java | Missing EPL-2.0 header | BLOCKING |
| 2 | src/.../Bar.java | Wildcard import: `import com.foo.*` | BLOCKING |
| 3 | src/.../Baz.java | No test updated for changed method | ADVISORY |

**Blocking issues:** N — PR cannot merge until fixed.
**Advisory issues:** N — fix recommended.
```

If no issues: "No blocking issues. PR looks clean."
