# Build Guide — dev-workflow-ai

This document covers building container images for dev-workflow-ai, the choices made, and how to use the images in Eclipse Che / OpenShift DevWorkspaces.

---

## What the image contains

| Layer | Contents |
|---|---|
| **API** | Fastify + LangGraph agent (`packages/agent-backend/lib/`) built by webpack |
| **UI** | React + PatternFly 6 app (`dist/`) built by Vite |
| **Claude Code** | `claude` binary (direct download from Google Storage) |
| **OpenCode** | `opencode` binary (GitHub releases) |
| **Gemini CLI** | `@google/gemini-cli` installed via npm |
| **Knowledge packs** | `pg_seed/eclipse-che/` bundled at `/app/pg_seed/eclipse-che` |

The image is self-contained: drop it into any Kubernetes pod with a postgres sidecar and it runs.

---

## Why `quay.io/fedora/nodejs-20-minimal`

| Requirement | Why this image satisfies it |
|---|---|
| No auth needed | `quay.io/fedora/` is a public registry — no Red Hat subscription or `imagePullSecret` required |
| OpenShift SCC compatible | Runs as **UID 1001** (non-root) out of the box — works under `restricted` and `restricted-v2` SCCs without any `anyuid` grant |
| No universal-developer-image | No 8 GB UDI pull — image is ~400–600 MB compressed |
| Node.js available | Node.js 20 LTS is sufficient (`engines: { node: ">=18" }` in package.json) |

Alternative runtime bases are documented in `build/dockerfiles/Dockerfile.alternatives`.

---

## Prerequisites

```bash
# Podman (preferred on RHEL/Fedora/CRC) or Docker
podman --version   # 4.x+

# Authenticated to quay.io
podman login quay.io -u oorel

# Environment variables
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=oorel
```

---

## Build commands

### Default — app image (API + UI + AI tools)

```bash
# Build for both linux/amd64 and linux/arm64 and push
./build/build.sh --multiarch

# Build locally for the current platform only (faster, no push)
podman build \
  -f build/dockerfiles/Dockerfile \
  -t quay.io/oorel/dev-workflow-ai:latest \
  .
```

Output image: `quay.io/oorel/dev-workflow-ai:<branch>_<timestamp>`

### Postgres sidecar image (OpenShift UID fix)

```bash
./build/build.sh --postgres-image
```

Produces `quay.io/oorel/dev-workflow-ai-postgres:<tag>`.  
Identical to `postgres:16-alpine` but with `PGDATA=/tmp/pgdata` baked in so it starts cleanly under any OpenShift-assigned UID.

### Single-container workspace image (UDI + postgres bundled)

```bash
./build/build.sh --workspace-image
```

Produces `quay.io/oorel/dev-workflow-ai-workspace:<tag>`.  
UDI base with postgresql16 installed and `start-postgres.sh` as the entrypoint — no sidecar needed.

---

## Run locally with Podman (no cluster needed)

Uses a Podman **pod** so the app and postgres share `localhost` — identical to
how Kubernetes runs sidecars. No docker-compose or external networking required.

### Quick start (pulls pre-built image from quay.io)

```bash
# Set at least one LLM key (optional — stub mode works without)
export ANTHROPIC_API_KEY=sk-ant-...   # or GEMINI_API_KEY / OLLAMA_BASE_URL
export GITHUB_TOKEN=ghp_...

./run/run-local-podman.sh --no-build
```

App is at **http://localhost:3000** | Postgres at **localhost:5433**

### Build locally then run

```bash
./run/run-local-podman.sh
# Builds quay.io/oorel/dev-workflow-ai:latest from source, then starts the pod
```

### Equivalent manual `podman run` commands

```bash
# 1. Create a pod (containers share localhost inside the pod)
podman pod create --name dev-workflow-ai -p 3000:3000 -p 5433:5432

# 2. Start postgres sidecar
podman run -d \
  --pod dev-workflow-ai \
  --name dev-workflow-ai-postgres \
  -e POSTGRES_DB=devworkflow \
  -e POSTGRES_USER=agent \
  -e POSTGRES_PASSWORD=agent \
  -e PGDATA=/tmp/pgdata \
  docker.io/postgres:16-alpine

# 3. Start the app (waits for postgres automatically via wait-for-postgres.sh)
podman run -d \
  --pod dev-workflow-ai \
  --name dev-workflow-ai-app \
  -e DATABASE_URL="postgres://agent:agent@localhost:5432/devworkflow" \
  -e KNOWLEDGE_DIR="/app/pg_seed/eclipse-che" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
  -e GITHUB_TOKEN="${GITHUB_TOKEN:-}" \
  quay.io/oorel/dev-workflow-ai:latest

# 4. Check health
curl http://localhost:3000/healthz
```

### Lifecycle commands

```bash
./run/run-local-podman.sh --logs   # tail app logs
./run/run-local-podman.sh --stop   # stop and remove pod

# Or via podman directly:
podman pod ps
podman logs -f dev-workflow-ai-app
podman pod stop dev-workflow-ai && podman pod rm dev-workflow-ai
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes (default set) | Postgres connection string |
| `KNOWLEDGE_DIR` | yes (default set) | Path to pg_seed knowledge pack |
| `ANTHROPIC_API_KEY` | one of these | Claude API key |
| `GEMINI_API_KEY` | one of these | Gemini API key |
| `OLLAMA_BASE_URL` | one of these | External Ollama (e.g. `http://host:11434`) |
| `GITHUB_TOKEN` | optional | Needed to open real PRs; dry-run works without |

> **Note:** `PGDATA=/tmp/pgdata` is already baked into the postgres run command above.
> This is the OpenShift non-root UID fix — it also works on local Podman.

---

## Custom tag and platform

```bash
export IMAGE_TAG=my-feature-branch
export PLATFORMS=linux/amd64          # arm64-only: linux/arm64

./build/build.sh --multiarch
```

---

## Update devfile.yaml after a push

Change the `image:` line in the `tools` component:

```yaml
components:
  - name: tools
    container:
      image: quay.io/oorel/dev-workflow-ai:latest   # ← update this tag
```

Then restart the DevWorkspace in the Che Dashboard or:

```bash
oc patch devworkspace dev-workflow-ai -n <namespace> \
  --type=json \
  -p='[{"op":"replace","path":"/spec/template/components/0/container/image","value":"quay.io/oorel/dev-workflow-ai:latest"}]'
oc patch devworkspace dev-workflow-ai -n <namespace> \
  --type=merge -p '{"spec":{"started":false}}'
sleep 3
oc patch devworkspace dev-workflow-ai -n <namespace> \
  --type=merge -p '{"spec":{"started":true}}'
```

---

## How postgres wait-for works

The image's `CMD` is `wait-for-postgres.sh` instead of a bare `node` invocation.

**Why:** In a Kubernetes pod all containers start simultaneously. If the Node.js API boots before the postgres sidecar is ready it fails immediately, triggering CrashLoopBackOff. The wait script polls `localhost:5432` every second (up to 60 s) and only then `exec`s the server — making the startup order-independent.

```
[wait-for-postgres] Waiting up to 60s for postgres at localhost:5432 ...
[wait-for-postgres] Still waiting... 5s elapsed
[wait-for-postgres] Postgres is up after 7s. Starting server.
```

Configuration:

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Parsed for host/port if set (standard pg URL) |
| `PGHOST` | `localhost` | Override postgres host |
| `PGPORT` | `5432` | Override postgres port |
| `PG_WAIT_SECS` | `60` | Max seconds to wait before starting anyway |

If postgres never becomes ready the script still starts the server after the timeout (the server's own retry/backoff handles reconnection).

---

## Alternative base images

See `build/dockerfiles/Dockerfile.alternatives` for the full tradeoff table.

Quick comparison:

| Image | Size | UID | Auth | Node |
|---|---|---|---|---|
| `quay.io/fedora/nodejs-20-minimal` (**default**) | ~200 MB | 1001 | none | 20 LTS |
| `registry.access.redhat.com/ubi9/nodejs-20` | ~350 MB | 1001 | none | 20 LTS |
| `docker.io/node:22-alpine` | ~150 MB | 0 (root) | Docker Hub rate limit | 22 |

To switch, replace the `FROM` line in `build/dockerfiles/Dockerfile` Stage 3.

---

## Troubleshooting

### CRC: disk eviction during image pull

CRC's default kubelet eviction threshold is 15 % (≈ 15 GB on a 100 GB disk).  
The UDI alone was 8.5 GB. The new image is ~1.2 GB.

If you still see evictions, lower the threshold in the CRC VM:

```bash
# SSH into CRC node
ssh -i ~/.crc/machines/crc/id_ed25519 -p 2222 core@127.0.0.1

sudo python3 - /etc/kubernetes/kubelet.conf <<'PYEOF'
import sys, re
with open(sys.argv[1]) as f: content = f.read()
content = re.sub(r'^evictionHard:\n(?:  [^\n]*\n)+', '', content, flags=re.MULTILINE)
BLOCK = "evictionHard:\n  nodefs.available: 3%\n  imagefs.available: 3%\n  memory.available: 100Mi\n  nodefs.inodesFree: 3%\n"
content = content.replace('evictionPressureTransitionPeriod:', BLOCK + 'evictionPressureTransitionPeriod:', 1)
with open(sys.argv[1], 'w') as f: f.write(content)
PYEOF

sudo systemctl daemon-reload && sudo systemctl restart kubelet
```

Then use `~/redeploy-che.sh` to restart the workspace.

### CrashLoopBackOff: tools container

1. Check logs: `oc logs <pod> -n <ns> -c tools --previous`
2. If the error is a postgres connection failure, verify `DATABASE_URL` env var is set correctly and postgres sidecar is healthy.
3. Verify `PGDATA=/tmp/pgdata` is set on the postgres container (OpenShift UID fix).

### Image pull errors

```bash
# Verify the image is accessible
podman pull quay.io/oorel/dev-workflow-ai:latest

# Check quay.io login
podman login quay.io --get-login
```

If the image is private, create an `imagePullSecret` in the workspace namespace:

```bash
oc create secret docker-registry quay-pull-secret \
  --docker-server=quay.io \
  --docker-username=oorel \
  --docker-password=<token> \
  -n <namespace>
```

---

## Ollama (local LLM)

`build/dockerfiles/ollama.Dockerfile` builds an Ollama image with the model pre-pulled at build time — no download delay at startup.

### Build

```bash
# Default model: qwen2.5-coder:7b (fast, ~4 GB)
podman build \
  --build-arg OLLAMA_MODEL=qwen2.5-coder:7b \
  -f build/dockerfiles/ollama.Dockerfile \
  -t dev-workflow-ai-ollama:latest \
  .

# Larger, higher quality (needs ~19 GB RAM):
podman build \
  --build-arg OLLAMA_MODEL=qwen2.5-coder:32b-q8_0 \
  -f build/dockerfiles/ollama.Dockerfile \
  -t dev-workflow-ai-ollama:latest \
  .
```

### Run standalone

```bash
podman run -d --name ollama -p 11434:11434 dev-workflow-ai-ollama:latest

# Then set in the app:
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=qwen2.5-coder:7b
yarn dev:api
```

### Run with the app via run-local-podman.sh

```bash
# Builds Ollama image + app image, starts both, wires OLLAMA_BASE_URL automatically
OLLAMA_MODEL=qwen2.5-coder:7b ./run/run-local-podman.sh --with-ollama

# Skip rebuilding the app image:
OLLAMA_MODEL=qwen2.5-coder:7b ./run/run-local-podman.sh --no-build --with-ollama
```

### GPU support

| GPU | Base image to use |
|---|---|
| CPU only (default) | `ollama/ollama:latest` (already in Dockerfile) |
| NVIDIA CUDA | `ollama/ollama:latest` + `--device nvidia.com/gpu=all` at runtime |
| AMD ROCm | `ollama/ollama:rocm` (change `FROM` in Dockerfile) |

### Recommended models

| Model | Size | Best for |
|---|---|---|
| `qwen2.5-coder:7b` | ~4 GB | Fast iteration, low-RAM machines |
| `qwen2.5-coder:14b` | ~9 GB | Better quality, moderate RAM |
| `qwen2.5-coder:32b-q8_0` | ~19 GB | Highest quality, needs ≥24 GB RAM |
| `codellama:13b` | ~7 GB | Alternative, good for Python/JS |
