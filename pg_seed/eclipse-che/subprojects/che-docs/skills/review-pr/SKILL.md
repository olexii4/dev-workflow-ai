---
name: review-pr
description: Review a che-docs PR against AsciiDoc/Antora style conventions. Reports findings by severity.
argument-hint: "[PR-number or PR-URL]"
---

# Review che-docs PR

## Required input

A PR number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the PR diff

```bash
PR_NUM=<parse from $ARGUMENTS>
gh pr diff ${PR_NUM} --repo eclipse-che/che-docs
gh pr view ${PR_NUM} --repo eclipse-che/che-docs --json title,body,files
```

### 2. Tier 1 — Always check

#### One sentence per line (ADVISORY)

```bash
gh pr diff ${PR_NUM} --repo eclipse-che/che-docs | grep "^\+" | grep -E "\. [A-Z]"
```

Lines with multiple sentences (`. ` followed by capital letter mid-line) = **ADVISORY**.

#### No images without alt text (BLOCKING)

```bash
gh pr diff ${PR_NUM} --repo eclipse-che/che-docs | grep "^\+" | grep -E "image::[^[]+\[\]"
```

`image::foo.png[]` with empty alt text = **BLOCKING**.

#### All xrefs use Antora format (BLOCKING)

```bash
gh pr diff ${PR_NUM} --repo eclipse-che/che-docs | grep "^\+" | grep -E "link:\.\./|link:https?://[^[]*\.(html|adoc)"
```

Plain `link:` to other doc pages = **BLOCKING**. Must use `xref:` syntax.

#### Procedure titles match file names (ADVISORY)

For new `.adoc` files, check that the file name (kebab-case) matches the page title (converted to kebab-case). Mismatch = **ADVISORY**.

### 3. Tier 2 — Trigger-based checks

#### New CLI command documented

If a new CLI flag or command is documented:
- Verify it matches the actual current CLI output (check against source repo)
- Note as **ADVISORY** if unverified: "⚠️ Unverified — confirm CLI output matches"

#### New configuration attribute documented

If a new attribute (ConfigMap key, env var, CheCluster spec field) is documented:
- Check it's added to `modules/<module>/partials/ref_checluster-custom-resource-fields.adoc` or equivalent reference page if a spec field
- Missing from reference page = **ADVISORY**

#### Version-specific content added

If content uses `ifdef::` conditionals or mentions a specific version:
- Verify the version guard matches the actual version this was introduced
- Hardcoded version numbers without attributes = **ADVISORY**

## Output

```
## PR Review: #NNNN — <title>

| # | File | Finding | Severity |
|---|---|---|---|
| 1 | modules/end-user-guide/pages/foo.adoc | Image with empty alt text | BLOCKING |
| 2 | modules/end-user-guide/pages/foo.adoc | Plain link instead of xref | BLOCKING |
| 3 | modules/end-user-guide/pages/foo.adoc | Two sentences on same line | ADVISORY |

**Blocking issues:** N
**Advisory issues:** N
```
