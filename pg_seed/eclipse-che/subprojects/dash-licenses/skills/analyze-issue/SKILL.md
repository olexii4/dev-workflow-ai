---
name: analyze-issue
description: Analyze a dash-licenses issue. Identifies affected Java module and fix scope.
argument-hint: "[issue-number]"
---

# Analyze dash-licenses Issue

## Required input

An issue number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo che-incubator/dash-licenses \
  --json number,title,body,labels,assignees,comments,state
```

Check labels. Stop if `wontfix`, `duplicate`.

### 2. Classify the issue type

| Type | Description | SP |
|---|---|---|
| False positive detection | Dash incorrectly flags a dep as unresolved | 1–2 |
| New package registry | Support a new npm/Maven/Python registry | 3 |
| CI / release fix | GitHub Actions, pom.xml, release workflow | 1 |
| Dependency update | Bump a dash-licenses dependency itself | 1 |
| Output format fix | `.deps/` file format incorrect | 2 |

### 3. Find affected Java source files

```bash
cd "$LOCAL_PATH"
find src/main/java -name "*.java" | head -20
grep -r "keyword" src/main/java --include="*.java" -l
```

### 4. Estimate story points

- **1**: config change, single function fix, dependency bump
- **2**: logic fix for detection algorithm or output format
- **3**: new registry integration (requires new fetcher class + tests)

## Output

```
## Issue Analysis: #NNNN — <title>

**Type:** false positive / new registry / CI fix / dep update / output format
**Affected files:**
- src/main/java/org/eclipse/che/licenses/LicenseChecker.java

**Root cause hypothesis:** <what is wrong>

**Fix scope:** <what needs to change>

**Story points:** 1

**IMPLEMENT_READY: che-incubator/dash-licenses#NNNN**
```
