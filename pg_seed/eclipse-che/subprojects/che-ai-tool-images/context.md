---
repo: che-incubator/che-ai-tool-images
default_branch: main
stack: [Dockerfile, Shell, GitHub Actions]
description: Multi-arch container images for AI tools in Che workspaces (OpenCode, Gemini CLI, Claude CLI)
auto_approve_min_priority: major
story_point_budget: 2
local_path: .repos/che-incubator/che-ai-tool-images
commands:
  test: "echo 'no tests'"
  lint: "hadolint $(find . -name Dockerfile*) 2>&1 | tail -20"

---
# che-ai-tool-images — AI Context File

> Load this file BEFORE any che-ai-tool-images work.
> Also load: context/eclipse-che-ecosystem.md

Last commit: `a3b810eb5` · 2026-08-26 · fix: bump AI tool CLI versions to latest
GitHub: `che-incubator/che-ai-tool-images`

---

## Role

Multi-arch container images for AI tools bundled into Eclipse Che workspaces. Each image packages a single AI CLI tool (OpenCode, Gemini CLI, Claude CLI, etc.) so it can be injected into workspace pods as a sidecar or init container.

These images are referenced by:
- `che-dashboard` (AI tools tab — `store/AiConfig/`, `routes/api/aiRegistry.ts`)
- `che-server` / CheCluster operator configuration

---

## Structure

```
che-ai-tool-images/
├── <tool-name>/
│   ├── Dockerfile      # One Dockerfile per AI tool
│   └── CHANGELOG.md    # Version history for this tool image
├── <tool-name>/
│   ├── Dockerfile
│   └── CHANGELOG.md
└── ...
```

One directory per tool. The directory name becomes part of the image tag.

---

## Dockerfile Pattern

```dockerfile
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest

# Pin the tool version explicitly — never use 'latest'
ARG TOOL_VERSION=1.2.3
ENV TOOL_VERSION=${TOOL_VERSION}

# Install for amd64
RUN microdnf install -y curl tar && \
    ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    curl -L "https://releases.tool.io/${TOOL_VERSION}/tool-linux-${ARCH}.tar.gz" | tar -xz && \
    mv tool /usr/local/bin/tool && \
    chmod +x /usr/local/bin/tool && \
    microdnf clean all
```

**Rules:**
- `ARG TOOL_VERSION` + `ENV TOOL_VERSION` pattern — version is parameterized
- `$(uname -m | sed ...)` pattern to detect amd64/arm64 at build time
- Multi-stage builds when compiler toolchain is needed (keep runtime image minimal)
- Base image: `ubi9/ubi-minimal` or `ubi9/ubi-micro` preferred

---

## Multi-Arch Build

Every image MUST be built for both architectures:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t quay.io/che-incubator/<tool-name>:<version> \
  --push \
  <tool-name>/
```

**Never push a single-arch image** — nodes with different architecture will fail silently with `IfNotPresent` pull policy.

---

## CHANGELOG.md Pattern

```markdown
# Changelog

## [1.2.4] - 2026-08-26
### Changed
- Bumped tool version from 1.2.3 to 1.2.4
```

---

## Common Issue Types

| Issue | What to do |
|---|---|
| Version bump | Update `ARG TOOL_VERSION` in Dockerfile, add entry to CHANGELOG.md |
| Multi-arch fix | Verify `uname -m` detection handles both `x86_64` and `aarch64` |
| Base image update | Bump base image digest/tag in FROM line |
| New tool image | Create `<tool-name>/Dockerfile` + `<tool-name>/CHANGELOG.md` |

---

## Coding Rules

- **Pin tool versions explicitly** — `ARG TOOL_VERSION=x.y.z`, never `:latest`
- **linux/amd64 + linux/arm64** — both platforms always
- **Update CHANGELOG.md** with every version bump
- **Minimal runtime image** — no build tools in final layer
- **Conventional commits**: `fix(tool-name): bump to X.Y.Z` + `Assisted-by:` trailer
