---
name: analyze-issue
description: Analyze a che-ai-tool-images issue. Identifies which tool image is affected, version bump scope, or multi-arch fix.
argument-hint: "[issue-number]"
---

# Analyze che-ai-tool-images Issue

## Required input

An issue number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo che-incubator/che-ai-tool-images \
  --json number,title,body,labels,assignees,comments,state
```

### 2. Identify affected tool

From the issue title and body, identify which tool image is affected:

| Tool name | Directory |
|---|---|
| Claude Code | `dockerfiles/claude-code/` |
| Gemini CLI | `dockerfiles/gemini-cli/` |
| OpenCode | `dockerfiles/opencode/` |

If issue affects all tools (e.g., base image CVE), all three Dockerfiles need updating.

### 3. Classify the issue type and estimate story points

| Type | SP | Example |
|---|---|---|
| Version bump (tool update) | 1 | "Bump opencode to v1.19.0" |
| Multi-arch fix (new arch support) | 2 | "Add s390x support to gemini-cli" |
| Base image update | 1–2 | "Update ubi9-minimal to 9.7" |
| Wrapper script fix | 2 | "Fix home dir redirect for Podman" |
| New tool image | 5 | "Add cursor-cli image" |

### 4. Check registry.json impact

```bash
cat "$LOCAL_PATH/registry.json"
```

Determine if `registry.json` needs updating:
- Version bump in Dockerfile → update `tools[N].tag` in registry.json
- New arch → update `tools[N].arch` array
- New tool → add new entry to both `providers[]` and `tools[]`

## Output

```
## Issue Analysis: #NNNN — <title>

**Tool:** claude-code / gemini-cli / opencode / all
**Type:** version bump / multi-arch / base image / wrapper fix / new tool
**registry.json update needed:** yes / no

**Affected files:**
- dockerfiles/opencode/Dockerfile
- registry.json (if applicable)

**Fix scope:** <what needs to change>

**Story points:** 1

**IMPLEMENT_READY: che-incubator/che-ai-tool-images#NNNN**
```
