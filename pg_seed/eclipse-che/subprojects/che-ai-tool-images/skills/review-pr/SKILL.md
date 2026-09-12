---
name: review-pr
description: Review a che-ai-tool-images PR — Dockerfile correctness, multi-arch, version pinning. Reports findings by severity.
argument-hint: "[PR-number or PR-URL]"
---

# Review che-ai-tool-images PR

## Required input

A PR number or URL. Parse from `$ARGUMENTS`.

## Workflow

### 1. Fetch the PR diff

```bash
PR_NUM=<parse from $ARGUMENTS>
gh pr diff ${PR_NUM} --repo che-incubator/che-ai-tool-images
gh pr view ${PR_NUM} --repo che-incubator/che-ai-tool-images --json title,body,files
```

### 2. Tier 1 — Always check

#### No `:latest` tags (BLOCKING)

```bash
gh pr diff ${PR_NUM} --repo che-incubator/che-ai-tool-images | grep "^\+" | grep -E "FROM .+:latest|image:.+:latest"
```

Any `:latest` in added lines = **BLOCKING**.

#### Multi-arch support present (BLOCKING for new images, ADVISORY for fixes)

Scan added Dockerfile content for TARGETARCH/BUILDPLATFORM handling:

```bash
gh pr diff ${PR_NUM} --repo che-incubator/che-ai-tool-images | grep "^\+" | grep -iE "TARGETARCH|BUILDPLATFORM|arm64|amd64"
```

New image with no multi-arch handling = **BLOCKING**. Existing image fix missing arch update = **ADVISORY**.

#### EPL-2.0 header in changed/new Dockerfiles (BLOCKING)

For each changed or added Dockerfile, verify the EPL-2.0 comment header block is present.

#### Wrapper script handles OpenShift arbitrary UIDs (ADVISORY)

Check the wrapper script (if present) redirects HOME or XDG dirs for non-writable $HOME:

```bash
gh pr diff ${PR_NUM} --repo che-incubator/che-ai-tool-images | grep "^\+" | grep -E "HOME|XDG_"
```

Missing UID handling for new tool = **ADVISORY**.

### 3. Tier 2 — Trigger-based checks

#### Base image changed (`FROM` line updated)

- Check new base image is from approved registry: `registry.access.redhat.com` (UBI), `docker.io/library/alpine`, `docker.io/node`
- Verify not from arbitrary Docker Hub accounts

#### registry.json changed

```bash
gh pr diff ${PR_NUM} --repo che-incubator/che-ai-tool-images | grep -A5 -B5 '"tag"\|"arch"'
```

Verify:
- `tools[N].tag` matches the `ARG TOOL_VERSION` in the Dockerfile
- `tools[N].arch` array includes all architectures handled in the Dockerfile
- Version format is consistent (all use semver tags, not commit hashes)

#### New tool added

Both `providers[]` and `tools[]` arrays must be updated in registry.json. Missing either = **BLOCKING**.

## Output

```
## PR Review: #NNNN — <title>

| # | File | Finding | Severity |
|---|---|---|---|
| 1 | dockerfiles/opencode/Dockerfile | Uses `:latest` base image tag | BLOCKING |
| 2 | registry.json | `tools[2].tag` doesn't match ARG OPENCODE_VERSION | BLOCKING |
| 3 | dockerfiles/opencode/Dockerfile | No UID redirect in wrapper script | ADVISORY |

**Blocking issues:** N
**Advisory issues:** N
```
