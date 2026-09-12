# AI Agent Guidelines — dev-workflow-ai

## What This Bot Does

dev-workflow-ai is an autonomous AI engineer that runs the Eclipse Che contribution loop:

```
Open Issues → Analyze → Branch → Implement → Review → PR → Fix → Merge
```

Review runs on the local branch diff **before** opening a PR, so only clean code is published. If the review finds blocking issues (`fix_feedback` node), fixes are applied and the branch is re-reviewed before the PR opens.

It operates across multiple subprojects, applying project-specific rules and shared conventions. Each run targets one issue within the session's story-point budget (default: 3 points).

## Repository Structure

```
dev-workflow-ai/
├── target/                         ← knowledge packs (one dir per product/team)
│   └── eclipse-che/
│       ├── context/                 ← ecosystem-level knowledge (pre-loaded)
│       ├── shared/                  ← shared rules + skills (universal across subprojects)
│       │   ├── rules/               ← commit conventions, issue analysis, issue filtering
│       │   └── skills/              ← filter-issues, pick-issue, assign-story-points, run-loop
│       └── subprojects/             ← per-project context, rules, and skills
│           ├── che-dashboard/
│           ├── che-server/
│           ├── devworkspace-operator/
│           └── ...
├── packages/
│   ├── agent-backend/src/           ← TypeScript backend (Fastify + LangGraph + PostgreSQL)
│   │   ├── agent/                   ← LangGraph graph, state, CLI executor
│   │   ├── api/routes/              ← REST API (runs, projects, issues, sources, auth, settings)
│   │   ├── db/                      ← migrations, schema, client
│   │   ├── llm/                     ← LLM client (Vertex AI, Claude, Gemini, Ollama)
│   │   └── nodes/                   ← agent graph nodes (pick, analyze, priority, implement, review)
│   └── agent-frontend/src/          ← React frontend (PatternFly 6, HashRouter, webpack)
│       ├── containers/              ← Redux-connected route wrappers (Dashboard, RunDetail, Projects)
│       ├── pages/                   ← Pure-props page components (Dashboard, RunDetail, Projects, Issues, Settings)
│       ├── store/                   ← Redux Toolkit store (Runs, Projects slices with actions/reducer/selectors)
│       ├── services/                ← api/ (typed fetch functions), helpers/ (dates, errors)
│       ├── components/              ← AppearanceToggle, UserMenu
│       └── contexts/                ← AuthContext, BrandingContext, ThemeContext
├── workflows/                       ← Claude Code Workflow scripts (TypeScript)
│   ├── implement.ts                 ← full autonomous implementation loop
│   └── review.ts                    ← post-PR review pipeline
├── build/
│   ├── build.sh                     ← unified build: --ui-only, --api-only, --multiarch, --postgres-image, --workspace-image
│   ├── BUILD.md                     ← full build documentation
│   └── dockerfiles/
│       ├── Dockerfile               ← app image: fedora/nodejs-20-minimal runtime, index.cjs, pg external
│       ├── postgres-openshift.Dockerfile  ← postgres sidecar with PGDATA=/tmp/pgdata for OpenShift
│       └── workspace.Dockerfile     ← single-container: UBI9/nodejs-20 + postgres 16 bundled
├── run/
│   ├── agent-test.sh                ← run agent pipeline without a cluster
│   └── create-ocp-secret.sh         ← create OpenShift secret for credentials
├── scripts/
│   ├── container_tool.sh            ← auto-detects Podman (preferred) or Docker
│   ├── dev-local.sh                 ← local dev (Postgres via container_tool.sh + native API + UI)
│   ├── init-db.ts                   ← seed DB from *.md files
│   └── run-issue-direct.ts          ← direct agent run (no API server needed)
├── devfile.yaml                     ← Eclipse Che DevWorkspace definition
├── rules.json                       ← machine-readable rules per subproject
├── .claude/                         ← Claude Code integration
│   ├── CLAUDE.md
│   ├── rules/                       ← commit conventions, issue analysis, context loading
│   └── skills/                      ← run-loop, filter-issues, pick-issue, assign-story-points
└── .env.example                     ← required environment variables
```

## How to Invoke

### Eclipse Che workspace (recommended)

The workspace image `quay.io/oorel/dev-workflow-ai:latest` has the app pre-built (API, UI, AI CLIs, pg_seed). On start, it waits for the Postgres sidecar, then serves the agent UI at port 3000 automatically.

```bash
# Create the OpenShift secret with credentials once (needs oc login):
./run/create-ocp-secret.sh
# Then open the factory URL in your Eclipse Che instance:
# https://<your-che-host>/f?url=https://github.com/olexii4/dev-workflow-ai

# Init the database on first open:
npx tsx scripts/init-db.ts
```

For CRC deployment issues (disk pressure, postgres crash loop), see `README.md` PART 7 and use `~/redeploy-che.sh`.

### Local dev (no cluster)

**Simplest — single container with PGlite (no postgres sidecar):**

```bash
# PGlite is embedded; omit DATABASE_URL and the app uses it automatically
podman run -d -p 3000:3000 \
  -e KNOWLEDGE_DIR=/app/pg_seed/eclipse-che \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  quay.io/oorel/dev-workflow-ai:latest

# With persistence across restarts:
podman run -d -p 3000:3000 \
  -v dwa-data:/app/data:Z \
  -e PGLITE_DATA_DIR=/app/data \
  -e KNOWLEDGE_DIR=/app/pg_seed/eclipse-che \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  quay.io/oorel/dev-workflow-ai:latest
```

**Podman pod (app + postgres sidecar, mirrors Eclipse Che topology):**

```bash
./run/run-local-podman.sh --no-build   # use pre-built image
./run/run-local-podman.sh              # build from source, then run
./run/run-local-podman.sh --stop       # teardown
```

See `tmp/local-run-guide.md` for full manual `podman run` commands and all options.

**Hot-reload dev (native processes):**

```bash
./scripts/dev-local.sh          # Postgres via container_tool.sh (Podman preferred), API + UI hot-reload
./scripts/dev-local.sh --api    # API only
./scripts/dev-local.sh --ui     # UI dev server only
```

### Run on a specific issue

```bash
# With API running:
./scripts/run-issue.sh https://github.com/eclipse-che/che-dashboard/issues/1234

# Without API (direct):
yarn run-issue https://github.com/eclipse-che/che-dashboard/issues/1234

# Without GITHUB_TOKEN: dry-run → output written to ./output/
```

### Build

```bash
./build/build.sh                   # UI + API
./build/build.sh --ui-only         # webpack only
./build/build.sh --api-only        # webpack only
./build/build.sh --multiarch       # build + push app image (needs IMAGE_REGISTRY_HOST + IMAGE_REGISTRY_USER_NAME)
./build/build.sh --postgres-image  # build + push OpenShift-compatible postgres sidecar
./build/build.sh --workspace-image # build + push single-container image (UBI9 + postgres bundled)
```

Key implementation notes for the app image (`Dockerfile`):
- Runtime: `quay.io/fedora/nodejs-20-minimal` — public, UID 1001, no UDI dependency
- Backend bundle: `index.cjs` — `.js` would be treated as ESM due to `"type":"module"` in `package.json`
- `pg` is in webpack `externals` — bundling it causes `pg.Pool` to be undefined at runtime
- `wait-for-postgres.sh` entrypoint: two-phase check (TCP + real DB query) before starting the server

## Subproject Registry

| Subproject | GitHub | Local Path | Stack | Last Commit |
|---|---|---|---|---|
| che-dashboard | eclipse-che/che-dashboard | /Users/oleksiiorel/workspace/eclipse-che/che-dashboard | TS, React 18, PF6, Redux | 2b372aea73 · 2026-09-04 |
| che-server | eclipse-che/che-server | /Users/oleksiiorel/workspace/eclipse-che/che-server | Java, Maven | cb5afc8de1 · 2026-07-24 |
| che-docs | eclipse-che/che-docs | /Users/oleksiiorel/workspace/eclipse-che/che-docs | AsciiDoc, Antora | ede3e33ca5 · 2026-08-13 |
| che-ai-tool-images | che-incubator/che-ai-tool-images | /Users/oleksiiorel/workspace/che-incubator/che-ai-tool-images | Dockerfile | a3b810eb57 · 2026-08-26 |
| devworkspace-generator | che-incubator/devworkspace-generator | /Users/oleksiiorel/workspace/devfile/devworkspace-generator | TypeScript, Node.js | c7c9ba2478 · 2026-03-16 |
| devworkspace-operator | devfile/devworkspace-operator | /Users/oleksiiorel/workspace/devfile/devworkspace-operator | Go, Operator SDK | 943ae8e461 · 2026-04-15 |
| dash-licenses | che-incubator/dash-licenses | /Users/oleksiiorel/workspace/che-incubator/dash-licenses | Java, Maven | 1bd84e94f0 · 2026-08-23 |

## Database Backends

The backend auto-selects a database based on environment variables:

| Condition | Backend | Use case |
|---|---|---|
| `DATABASE_URL` set | `pg.Pool` → real Postgres | Eclipse Che, production |
| `DATABASE_URL` unset, `PGLITE_DATA_DIR` set | PGlite → persistent file store | Local dev with persistence |
| `DATABASE_URL` unset, no `PGLITE_DATA_DIR` | PGlite → in-memory | Quick tests, CI |

PGlite (`@electric-sql/pglite`) is Postgres 16 compiled to WASM (~3.5 MB). It supports the full PostgreSQL SQL dialect used by the migrations — no schema changes needed when switching backends.

## Issue Scoring Formula

Base score by type: `kind/bug` → 10, `kind/enhancement` → 6, `area/docs` → 3

Priority boosts: `priority/critical` +5, `priority/major` +3, test-reproduction +2, failing-CI +2, linked-PR +3, acceptance-criteria +1, `good first issue` +1

Story point budget per session: **3** (configurable in `rules.json`).

## Red Hat Compliance

- All code EPL-2.0 compatible
- `Assisted-by: {AGENT_NAME}` trailer in all commits — never `Made-with` or `Co-authored-by`
- Run `yarn license:generate` after any `package.json` change
- Never include credentials, tokens, or secrets in code
