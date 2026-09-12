# dev-workflow-ai

**Autonomous AI software engineer built for Eclipse Che** — automates the full issue→implement→review→PR cycle across any GitHub project, running as a Cloud Development Environments (CDEs) workspace on OpenShift.

Point it at any issue, and the Eclipse Che CDE will pick it up, implement a fix, review the code on the local branch, and open a pull request — unattended. Review runs **before** the PR is opened, so only clean code is published.

This project was built specifically to work on Eclipse Che's own subprojects. A complete knowledge pack for the Eclipse Che ecosystem ([che-dashboard](https://github.com/eclipse-che/che-dashboard), [che-server](https://github.com/eclipse-che/che-server), [devworkspace-operator](https://github.com/devfile/devworkspace-operator), [devworkspace-generator](https://github.com/che-incubator/devworkspace-generator), [che-ai-tool-images](https://github.com/che-incubator/che-ai-tool-images), [dash-licenses](https://github.com/che-incubator/dash-licenses), [che-docs](https://github.com/eclipse-che/che-docs)) is bundled in `pg_seed/eclipse-che/`.

---

## PART 1: Open the agent workspace in Eclipse Che

The fastest path: click the factory link below to open a ready-to-use CDE workspace in your Eclipse Che instance.

```
https://<your-che-host>/f?url=https://github.com/olexii4/dev-workflow-ai
```

Eclipse Che reads the `devfile.yaml` at the repository root, provisions two containers (the pre-built app image `quay.io/oorel/dev-workflow-ai:latest` and a Postgres sidecar), clones the project, and exposes the agent UI at port 3000.

The workspace image has the Node.js API, webpack UI, and AI CLI tools (Claude Code, OpenCode, Gemini CLI) pre-built inside — no `yarn install` or `yarn build` needed. On workspace start, the server waits for Postgres to be ready, then starts automatically.

Once the workspace is open, run the following commands in order:

```bash
# 1. Set your API key in the workspace terminal (never commit this)
export ANTHROPIC_API_KEY=sk-ant-...   # Claude — recommended
# or: export GEMINI_API_KEY=AIza...
# or: export OLLAMA_BASE_URL=http://192.168.1.10:11434  (external Ollama)
export GITHUB_TOKEN=ghp_...

# 2. Init the database and import Eclipse Che knowledge
npx tsx scripts/init-db.ts
```

The agent UI is available immediately at the `app` endpoint (port 3000) — no manual server start needed.

> **Note:** Authentication is handled by the Eclipse Che gateway (oauth-proxy). The app trusts the OpenShift user identity forwarded by the gateway. No GitHub OAuth app or session cookies are required.

---

## PART 2: Configure the LLM

The agent supports three LLM backends in priority order:

| Backend | When to use | Setup |
|---|---|---|
| Claude via Vertex AI | Red Hat / GCP environments — no API key management | `ANTHROPIC_VERTEX_PROJECT_ID=...` + service account |
| Claude (Anthropic) | Best quality, direct API | `export ANTHROPIC_API_KEY=sk-ant-...` |
| Gemini | Fast, generous free tier | `export GEMINI_API_KEY=AIza...` |
| External Ollama | Air-gapped / intranet | `export OLLAMA_BASE_URL=http://host:11434` |

The `OLLAMA_BASE_URL` env var lets you connect to an Ollama instance running anywhere on your network — a workstation, a GPU server in the lab, or a VM. Set the model with `OLLAMA_MODEL` (default: `qwen2.5-coder:7b`).

> **Tip:** On CRC, skip Ollama entirely. The cluster has limited RAM, and Claude/Gemini deliver better code quality with no local GPU needed.

---

## PART 3: How the agent works

### 1. Load project knowledge

The agent reads context from PostgreSQL, not source files. On startup, it imports all `*.md` files from the active knowledge pack:

```bash
# Import the bundled Eclipse Che knowledge pack:
npx tsx scripts/init-db.ts

# Or load any pack from the UI:
# Settings → Knowledge Sources → Load
```

To add your own project, create `pg_seed/<your-org>/subprojects/<repo-slug>/context.md`:

```yaml
---
repo: myorg/my-service
stack: [TypeScript, Node.js]
description: Short description of what this repo does
local_path: /projects/my-service   # optional, for implementation
auto_approve_min_priority: major
story_point_budget: 3
issue_source: https://github.com/myorg/my-service/issues
---

# my-service — AI Context

Write dense, accurate information about the codebase here.
The agent reads this instead of traversing source files.
```

### 2. Run the issue loop

From the **Issues** page, browse scored open issues from GitHub, or paste any issue URL and click **▶ Start**.

The agent then:

1. Checks priority against `auto_approve_min_priority` — auto-approves if above threshold
2. Analyzes affected files using the project context from PostgreSQL
3. Implements the fix on a new branch using Claude/Gemini/Ollama
4. Runs tests and lint; retries up to 3× on failure
5. Reviews the local branch diff with 5 parallel reviewers (correctness, silent failures, test coverage, conventions, TypeScript types)
6. Applies fix-feedback if blocking issues are found, then re-reviews
7. Opens a pull request once the review is clean; deletes the local branch after PR is created
8. Posts findings to the PR if any non-blocking issues remain

### 3. Monitor live

The **Run Detail** page streams every phase in real time via WebSocket — pick-issue → analyze → priority-check → implement → review → open-PR.

---

## PART 4: Add a project

**Via UI:** Subprojects → + Add project — paste any `owner/repo`, set priority threshold and story-point budget.

**Via knowledge pack:** create a directory in `pg_seed/<org-name>/subprojects/<slug>/` with a `context.md` (YAML frontmatter + codebase knowledge) and optionally a `devfile.yaml` for opening that project as a CDE workspace. Then import from Settings → Knowledge Sources.

Knowledge pack layout:

```
pg_seed/
└── my-org/
    ├── context/
    │   └── overview.md           ← ecosystem-level overview (optional)
    ├── shared/
    │   ├── rules/                ← coding standards shared across all subprojects
    │   └── skills/               ← shared agent skills
    └── subprojects/
        ├── my-service-a/
        │   ├── context.md        ← YAML frontmatter + codebase knowledge
        │   ├── devfile.yaml      ← minimal CDE devfile for this repo
        │   └── rules/dev.md      ← project-specific conventions
        └── my-service-b/
            ├── context.md
            └── devfile.yaml
```

Each subproject `devfile.yaml` opens a workspace tailored to that repository — the right base image, memory limits, build commands, and exposed ports. The bundled Eclipse Che subprojects all include one.

---

## PART 5: Test without a cluster

The fastest way to verify the agent pipeline without any infrastructure:

```bash
./run/agent-test.sh \
  --issue https://github.com/eclipse-che/che/issues/20670 \
  --stub
```

`--stub` mode reads context from `pg_seed/eclipse-che/` files, fetches the issue from GitHub's public API (no token needed), and generates template output — no LLM, no database, no cluster required.

Output is written to `output/<owner>-<repo>-<issue>/`:

```
output/
└── eclipse-che-che-20670/
    ├── analysis.md        ← issue title, labels, affected files, story points
    ├── pr-description.md  ← PR description the agent would open
    └── changes.patch      ← proposed code changes (real diff when LLM available)
```

Test with a real LLM:

```bash
# Claude
export ANTHROPIC_API_KEY=sk-ant-...
./run/agent-test.sh --issue https://github.com/eclipse-che/che/issues/20670

# External Ollama on your intranet
export OLLAMA_BASE_URL=http://192.168.1.10:11434
export OLLAMA_MODEL=qwen2.5-coder:7b
./run/agent-test.sh --issue https://github.com/eclipse-che/che/issues/20670 --force-priority
```

---

## PART 6: Local dev (without Eclipse Che)

### Simplest — single container, no postgres sidecar needed

The image has **PGlite** built in (Postgres-in-WASM, ~3.5 MB). When `DATABASE_URL` is not set the app uses PGlite automatically — no separate database container required.

```bash
# In-memory (resets on restart — good for quick tests)
podman run -d -p 3000:3000 \
  -e KNOWLEDGE_DIR=/app/pg_seed/eclipse-che \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  quay.io/oorel/dev-workflow-ai:latest

# Persistent (data survives restarts)
podman run -d -p 3000:3000 \
  -v dwa-data:/app/data:Z \
  -e PGLITE_DATA_DIR=/app/data \
  -e KNOWLEDGE_DIR=/app/pg_seed/eclipse-che \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  quay.io/oorel/dev-workflow-ai:latest
```

App at **http://localhost:3000**

### With postgres sidecar (Podman pod, same as Kubernetes)

```bash
# Full-featured local run with the helper script:
export ANTHROPIC_API_KEY=sk-ant-...
export GITHUB_TOKEN=ghp_...
./run/run-local-podman.sh --no-build   # pull pre-built image
./run/run-local-podman.sh              # build from source, then run
./run/run-local-podman.sh --logs       # tail app logs
./run/run-local-podman.sh --stop       # teardown
```

See `tmp/local-run-guide.md` for all options including manual `podman run` commands.

### Hot-reload dev (yarn, no container needed)

Fastest path for development — no Docker, no Podman, no image build. Requires Node 18+ and yarn 4.x (berry).

**Option A — PGlite embedded (simplest, no postgres)**

`yarn dev:api` uses PGlite (Postgres-in-WASM) automatically when `DATABASE_URL` is not set:

```bash
yarn install

# At least one LLM key:
export ANTHROPIC_API_KEY=sk-ant-...   # or GEMINI_API_KEY / OLLAMA_BASE_URL

# GITHUB_TOKEN is optional:
#   not set → dry-run (writes output/*.md + *.patch, no PR created)
#             UI shows "Dev Mode" with a placeholder avatar
#   set     → real PR creation; UI resolves your GitHub username and avatar
export GITHUB_TOKEN=ghp_...

yarn dev:api   # API at http://localhost:3000 (hot-reload, PGlite, knowledge auto-seeded)
```

In a second terminal:
```bash
yarn dev:ui    # UI at http://localhost:5173, proxies /api and /ws to :3000
```

Dry-run output when `GITHUB_TOKEN` is not set:
```
output/
└── <repo>-<issue-number>/
    ├── pr-description.md
    ├── changes.patch
    └── analysis.md
```

**Option B — external postgres (single container)**

```bash
podman run -d --name dwa-postgres -p 5433:5432 \
  -e POSTGRES_DB=devworkflow -e POSTGRES_USER=agent -e POSTGRES_PASSWORD=agent \
  -e PGDATA=/tmp/pgdata docker.io/postgres:16-alpine

export DATABASE_URL="postgres://agent:agent@localhost:5433/devworkflow"
export KNOWLEDGE_DIR=$(pwd)/pg_seed/eclipse-che
export ANTHROPIC_API_KEY=sk-ant-...
yarn dev:api
```

**Common issues**

| Problem | Fix |
|---|---|
| `Port 3000 already in use` | `lsof -i :3000 \| awk 'NR>1{print $2}' \| xargs kill -9` |
| `Cannot connect to postgres` | Unset `DATABASE_URL` to switch to PGlite: `unset DATABASE_URL` |
| Force re-seed | `rm -rf .local/pglite && yarn dev:api` |

> **Note:** Without the Eclipse Che gateway, the backend runs in dev mode — all routes are open and `/api/auth/me` returns a synthetic dev user (or your real GitHub identity when `GITHUB_TOKEN` is set). No authentication configuration needed.

---

## Stack

- **LangGraph.js** — stateful, resumable agent graph (TypeScript)
- **Claude / Gemini / Ollama** — LLM backends (external Ollama supported via `OLLAMA_BASE_URL`)
- **React + PatternFly 6** — web UI (dashboard, issue browser, live run view); webpack build, CSS modules
- **Redux Toolkit** — state management (Runs, Projects slices; `createAsyncThunk` + TTL caching)
- **Fastify** — REST API + WebSocket; Swagger UI at `/api/swagger`
- **PostgreSQL / PGlite** — persistent state (agent checkpoints, run history, project contexts); PGlite (Postgres-in-WASM) used automatically when `DATABASE_URL` is unset
- **Eclipse Che / OpenShift** — CDE platform, OpenShift OAuth via gateway

## Build

```bash
./build/build.sh                  # UI (webpack) + API (webpack)
./build/build.sh --multiarch      # build and push app image (amd64 + arm64) → quay.io/<org>/dev-workflow-ai
./build/build.sh --postgres-image # build OpenShift-compatible postgres sidecar image
./build/build.sh --workspace-image # build single-container image (UBI9/Node.js 20 + postgres bundled)
```

Container builds use `scripts/container_tool.sh` — Podman is used when available, Docker otherwise. See `build/BUILD.md` for full documentation.

---

## PART 7: CRC deployment troubleshooting

Running on CodeReady Containers (CRC) requires some one-time fixes due to limited disk and restrictive kubelet defaults.

### Workspace won't start: disk pressure

CRC's default eviction threshold (15%) is too aggressive for the workspace image pull. The fix has already been applied to `kubelet.conf` on the cluster (threshold lowered to 3%). If it reverts after a CRC restart, run:

```bash
~/redeploy-che.sh [workspace-name] [namespace]
```

`redeploy-che.sh` (in `$HOME`) does all of the following automatically:
- Frees disk in the CRC VM (prunes dead containers + dangling images)
- Patches kubelet eviction threshold to 3%
- Pins the workspace image in CRI-O so image GC doesn't remove it
- Pre-pulls the workspace and postgres images on the node
- Checks `PGDATA=/tmp/pgdata` is set on the postgres container (OpenShift non-root UID fix)
- Restarts the DevWorkspace and watches until Running or Failed

### Postgres crash loop: non-root UID

OpenShift assigns a random non-root UID to containers. The official `postgres:16-alpine` image creates its data directory owned by UID 70 (`postgres` user), which the assigned UID cannot access. The fix: set `PGDATA=/tmp/pgdata` in the postgres container env — the container then creates the data directory in `/tmp`, which it can own. This is already set in `devfile.yaml`.

### Build the app image

The workspace image is published at `quay.io/oorel/dev-workflow-ai:latest`. To rebuild:

```bash
export IMAGE_REGISTRY_HOST=quay.io
export IMAGE_REGISTRY_USER_NAME=oorel
./build/build.sh --multiarch
```

Key fixes applied to the Dockerfile:
- Runtime base: `quay.io/fedora/nodejs-20-minimal` (not UDI — 8× smaller, public registry, UID 1001)
- Output: `packages/agent-backend/lib/server/index.cjs` — webpack bundle uses CommonJS `require()`; `package.json` has `"type":"module"` so `.js` extension would cause Node to reject it
- `pg` is in webpack `externals` — loaded from `node_modules` at runtime to avoid CJS/ESM interop issues
- Entrypoint: `wait-for-postgres.sh` — polls TCP port then probes DB with a real query before starting the server
