# Copyright (c) 2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

ARG BUILDPLATFORM
ARG TARGETPLATFORM

# ── Stage 1: build UI + backend ───────────────────────────────────────────────
# Uses node:22-alpine only for the build — NOT present in the final image.
FROM --platform=${BUILDPLATFORM:-linux/amd64} docker.io/node:22-alpine AS builder

WORKDIR /app

# Copy yarn 4 berry runtime BEFORE package.json so the correct yarn version is
# picked up during install (yarn resolves its version from .yarnrc.yml).
COPY .yarnrc.yml ./
COPY .yarn/releases/ ./.yarn/releases/

# Copy workspace manifests first to cache the install layer independently from
# source changes. Only re-runs when package.json or yarn.lock changes.
COPY package.json yarn.lock tsconfig.json ./
COPY packages/agent-backend/package.json ./packages/agent-backend/package.json
COPY packages/agent-frontend/package.json ./packages/agent-frontend/package.json
RUN yarn install

# Copy source and compile:
#   agent-frontend  → Vite build → dist/
#   agent-backend   → webpack   → packages/agent-backend/lib/
COPY packages ./packages
RUN yarn build

# ── Stage 2: download AI tool binaries ───────────────────────────────────────
FROM --platform=${TARGETPLATFORM:-linux/amd64} docker.io/alpine:3.21 AS tools-builder

ARG TARGETARCH
ARG CLAUDE_CODE_VERSION=2.1.246
ARG OPENCODE_VERSION=v1.18.14

RUN apk add --no-cache curl tar gzip

# Claude Code — direct binary download (avoids npm cross-compilation issues)
RUN set -e && \
    case "${TARGETARCH}" in \
      amd64) PLATFORM="linux-x64"   ;; \
      arm64) PLATFORM="linux-arm64" ;; \
      *)     PLATFORM="linux-x64"   ;; \
    esac && \
    curl -fsSL -o /usr/local/bin/claude \
      "https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/${CLAUDE_CODE_VERSION}/${PLATFORM}/claude" && \
    chmod +x /usr/local/bin/claude

# OpenCode — GitHub release tarball
RUN set -e && \
    case "${TARGETARCH}" in \
      amd64) ARCH="x64"   ;; \
      arm64) ARCH="arm64" ;; \
      *)     ARCH="x64"   ;; \
    esac && \
    curl -fsSL -o /tmp/opencode.tar.gz \
      "https://github.com/anomalyco/opencode/releases/download/${OPENCODE_VERSION}/opencode-linux-${ARCH}.tar.gz" && \
    tar -xzf /tmp/opencode.tar.gz -C /tmp && \
    mv /tmp/opencode /usr/local/bin/opencode && \
    chmod +x /usr/local/bin/opencode

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
# quay.io/fedora/nodejs-20-minimal:
#   - Public registry, no authentication required
#   - Runs as non-root UID 1001 out of the box — compatible with OpenShift SCCs
#   - Minimal Fedora base — smaller attack surface than full Fedora
#   - Node.js 20 LTS (the backend's engines field allows >=18)
#
# To switch base image see build/dockerfiles/Dockerfile.alternatives
FROM --platform=${TARGETPLATFORM:-linux/amd64} quay.io/fedora/nodejs-20-minimal

WORKDIR /app

# Gemini CLI is npm-only (no standalone binary), so install it here where
# Node.js is available. Runs as the non-root user (1001) — no sudo needed.
ARG GEMINI_CLI_VERSION=0.57.0
RUN npm install -g @google/gemini-cli@${GEMINI_CLI_VERSION} && npm cache clean --force

# AI tool binaries
COPY --from=tools-builder /usr/local/bin/claude   /usr/local/bin/claude
COPY --from=tools-builder /usr/local/bin/opencode /usr/local/bin/opencode

# Application artefacts — only what the runtime needs (no source, no dev deps)
COPY --from=builder /app/dist                          ./dist
COPY --from=builder /app/packages/agent-backend/lib    ./packages/agent-backend/lib
# lib/server/ now contains index.cjs (CommonJS bundle) instead of index.js,
# because package.json has "type":"module" which would cause Node to reject
# a .js webpack bundle that uses require() internally.
COPY --from=builder /app/node_modules                  ./node_modules
COPY --from=builder /app/package.json                  ./package.json

# Knowledge packs (pg_seed/) bundled into the image so the agent works
# without cloning the repo.  Override at runtime with KNOWLEDGE_DIR.
COPY pg_seed ./pg_seed
ENV KNOWLEDGE_DIR=/app/pg_seed/eclipse-che

# Startup script — waits for postgres before launching the Node.js server
COPY build/dockerfiles/scripts/wait-for-postgres.sh /usr/local/bin/wait-for-postgres.sh

EXPOSE 3000

# wait-for-postgres.sh blocks until DB is reachable, then exec's the server.
# This prevents CrashLoopBackOff when the postgres sidecar starts slower than
# the tools container in a DevWorkspace / Kubernetes pod.
CMD ["/usr/local/bin/wait-for-postgres.sh"]
