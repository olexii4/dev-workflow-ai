---
name: fix-issue
description: Implement a fix for che-ai-tool-images — Dockerfile update, version bump, or multi-arch support.
argument-hint: "[issue-number]"
---

# Fix che-ai-tool-images Issue

## Required input

An issue number. `analyze-issue` must have been run first.

## Workflow

### 1. Set up the branch

```bash
cd "$LOCAL_PATH"
git checkout main
git pull origin main
git checkout -b issue-<ISSUE_NUM>
```

### 2. Implement the fix in the Dockerfile

Follow these rules for every Dockerfile:

**Version pinning** — always pin explicitly, never use `:latest`:
```dockerfile
ARG TOOL_VERSION=v1.19.0   # pin exact version
```

**Multi-arch support** — always handle amd64 and arm64 at minimum:
```dockerfile
RUN case "${TARGETARCH}" in \
  amd64) ARCH="x64" ;; \
  arm64) ARCH="arm64" ;; \
  *) echo "Unsupported: ${TARGETARCH}"; exit 1 ;; \
esac
```

**OpenShift arbitrary UID support** — wrapper scripts must redirect non-writable HOME:
```sh
if [ ! -w "$HOME" ]; then
  export HOME="/tmp/tool-home"
fi
mkdir -p "$HOME/.config"
```

**EPL-2.0 header** in every Dockerfile:
```dockerfile
# Copyright (c) 2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
```

**Base image** — use UBI (ubi9/ubi-minimal or ubi10/ubi-minimal) for runtime stage, Alpine for build stage.

### 3. Update registry.json if needed

For version bump: update `tools[N].tag` field.
For new arch: update `tools[N].arch` array.
For new tool: add entries to both `providers[]` and `tools[]`.

### 4. Test the build locally (if Docker available)

```bash
# Test single arch first (fast)
docker build -f dockerfiles/<tool>/Dockerfile \
  --build-arg TARGETARCH=amd64 \
  -t test-<tool>:local .

# Verify binary works
docker run --rm test-<tool>:local <tool-binary> --version

# Multi-arch (needs buildx)
docker buildx build --platform linux/amd64,linux/arm64 \
  -f dockerfiles/<tool>/Dockerfile .
```

### 5. Commit

```bash
git add dockerfiles/<tool>/Dockerfile registry.json
git commit -m "$(cat <<'EOF'
fix(<tool>): bump <tool> to v<version>

Closes #<ISSUE_NUM>

Assisted-by: Claude Sonnet 4.6
Signed-off-by: $(git config user.name) <$(git config user.email)>
EOF
)"
```

### 6. Push and open PR

```bash
git push -u origin issue-<ISSUE_NUM>

gh pr create \
  --repo che-incubator/che-ai-tool-images \
  --title "fix(<tool>): bump to v<version>" \
  --body "$(cat <<'EOF'
## What

Bumps <tool> from vX.Y.Z to vA.B.C.

## How tested

Local docker build verified on amd64.

Closes #<ISSUE_NUM>
EOF
)"
```

## Output

Report the PR URL.
