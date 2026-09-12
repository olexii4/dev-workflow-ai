---
name: analyze-issue
description: Analyze a che-docs issue. Identifies affected Antora module and pages. Always 1 story point max.
argument-hint: "[issue-number]"
---

# Analyze che-docs Issue

## Required input

An issue number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo eclipse-che/che-docs \
  --json number,title,body,labels,assignees,comments,state
```

Check labels. Stop if `wontfix`, `duplicate`.

### 2. Identify the Antora module

Map issue topic to module:

| Topic | Module |
|---|---|
| Installation, administration, operators, Kubernetes | `administration-guide` |
| End-user features, workspaces, editors, git | `end-user-guide` |
| What is Che, architecture overview | `overview` |
| What's new, changelog | `release-notes` |

### 3. Find the affected AsciiDoc file

```bash
cd "$LOCAL_PATH"

# Search by topic keyword in the relevant module
grep -r "keyword" modules/<module-name>/ --include="*.adoc" -l

# Search by heading text
grep -r "= Heading From Issue" modules/ --include="*.adoc" -l
```

### 4. Classify the work

| Type | Examples |
|---|---|
| New procedure | "Document Device Auth Tokens feature" |
| Update existing | "Update screenshots for new UI", "Fix outdated command" |
| Fix broken xref | "Fix broken link to deprecated page" |
| Add missing attribute | "Add configmap attribute to attributes.adoc" |

### 5. Story points

**Always 1 SP maximum for docs-only changes.** If the issue requires also changing source code (e.g., adding a new API endpoint _and_ documenting it), split into two separate issues.

## Output

```
## Issue Analysis: #NNNN — <title>

**Module:** administration-guide / end-user-guide / overview / release-notes
**Type:** new procedure / update / fix xref / add attribute

**Affected files:**
- modules/end-user-guide/pages/device-auth-tokens.adoc (new)
- modules/end-user-guide/nav.adoc (add nav entry)

**Fix scope:** <what needs to be written or changed>

**Story points:** 1

**IMPLEMENT_READY: eclipse-che/che-docs#NNNN**
```
