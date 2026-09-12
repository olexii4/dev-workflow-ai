---
repo: eclipse-che/che-dashboard
default_branch: main
stack: [TypeScript, React 18, PatternFly 6, Redux Toolkit, Fastify, Yarn workspaces]
description: Web UI for Eclipse Che — workspace management, factory flows, user preferences, AI tools
auto_approve_min_priority: major
story_point_budget: 3
local_path: .repos/eclipse-che/che-dashboard
---
# che-dashboard — AI Context File

> Load this file BEFORE any implementation work. Read it with the Read tool — do NOT traverse src/.
> Also load: context/eclipse-che-ecosystem.md (ecosystem) and projects/che-dashboard/context-patternfly.md (UI patterns).

Last commit: `2b372aea73` · 2026-09-04 · test(workspace-details): improve coverage for Change Editor feature
GitHub: `eclipse-che/che-dashboard`

---

## Role

Web UI for Eclipse Che. Key user flows:

- **Workspace list**: view, start, stop, delete workspaces
- **Factory flow**: create workspace from Git URL — parses Devfile, generates DevWorkspace CR via devworkspace-generator
- **User preferences**: git config, SSH keys, PATs, container registries, AI provider keys (OpenAI/Anthropic/Google), device auth tokens
- **AI tools tab**: browse and enable/disable AI tools (references che-ai-tool-images)
- **Workspace details**: editor selection (Change Editor), devfile editor, storage, environment variables
- **Backup/restore**: workspace state persistence

---

## Package Structure

```
packages/
├── common/               # Shared types/DTOs/helpers — consumed by both backend and frontend
│   └── src/
│       ├── constants/    # Shared constants
│       ├── dto/          # TypeScript interfaces for all API responses
│       ├── helpers/      # Shared utility functions
│       └── types/        # CheCluster, DevWorkspace, DevWorkspaceTemplate type defs
│
├── dashboard-backend/    # Node.js Fastify backend; proxies all k8s API calls
│   └── src/
│       ├── constants/
│       ├── devworkspaceClient/   # Kubernetes API client wrappers
│       │   └── services/         # gitConfigApi/ logsApi/ personalAccessTokenApi/ sshKeysApi/
│       ├── helpers/
│       ├── models/
│       ├── plugins/
│       ├── routes/api/           # One file per feature (see full list below)
│       ├── services/
│       │   ├── gitClient/        # Git operations
│       │   └── kubeclient/       # Raw k8s client setup
│       └── localRun/             # Local dev server hooks/proxies
│
└── dashboard-frontend/   # React 18 SPA
    └── src/
        ├── components/   # Reusable UI — no Redux, no direct API calls
        ├── containers/   # Redux-connected smart components
        ├── contexts/     # React contexts (Theme, WorkspaceActions)
        ├── Layout/       # App shell (ErrorBoundary, Header, Navigation, Sidebar)
        ├── pages/        # Pure presentational layout — receive props from containers
        ├── preload/      # App bootstrap/preload logic
        ├── Routes/       # React Router route definitions
        ├── services/     # API clients, helpers, adapters
        ├── store/        # Redux Toolkit slices (one dir per slice)
        └── typings/      # Global TypeScript type augmentations
```

---

## Frontend Architecture

### Container / Page / Component Pattern

| Layer | Directory | Role |
|---|---|---|
| Smart | `containers/` | Redux-connected; fetch data via `useSelector`/`dispatch`; pass props down |
| Presentational | `pages/` | Pure layout; receive all data as props; no Redux |
| Reusable | `components/` | Shared UI pieces; no Redux, no direct API calls |

**Available containers/pages:**

| Container/Page | Feature |
|---|---|
| `GetStarted/` | Getting started page |
| `Loader/` | Workspace loader/progress |
| `RestoreFromBackup/` | Restore workspace from backup |
| `UserPreferences/` | All user preference tabs |
| `WorkspaceDetails/` | Single workspace detail view |
| `WorkspacesList/` | Main workspace list |

**Available components:**

```
AiSelector          AiToolIcon          AppAlertGroup       BackupStatusBadge
BannerAlert         BasicViewer         BulkSelector        CheTooltip
CpuLimitField       DevfileViewer       EditorIcon          EditorSelector
EditorTools         ExpandableWarning   Fallback            Head
Header              ImportFromGit       InputGroupExtended  MemoryLimitField
Progress            ResourceIcon        SessionTimeoutModal Spacer
TagLabel            TextFileUpload      UnsavedChangesModal UntrustedSourceModal
Workspace           WorkspaceEvents     WorkspaceLogs       WorkspaceProgress
```

**Layout components:** `ErrorBoundary/`, `ErrorReporter/`, `Header/`, `Navigation/`, `Sidebar/`, `StoreErrorsAlert/`

**Absolute import alias:** Always `@/` — e.g., `@/components/Workspace/Status/Label` (never `./` or `../`)

---

### Redux Store Slices

All slices live in `store/<SliceName>/`. Each exports selectors, async thunks, and a reducer.

| Slice | Purpose |
|---|---|
| `AiConfig` | AI provider configuration (keys, endpoints) |
| `Backups` | Workspace backup state |
| `BannerAlert` | Global banner alerts |
| `Branding` | CheCluster branding config (logo, colors, product name) |
| `ClusterConfig` | Cluster-wide config from CheCluster CR |
| `ClusterInfo` | Kubernetes cluster info (version, provider) |
| `DevfileRegistries` | Devfile registry entries (available stacks) |
| `DeviceAuthToken` | Device authorization tokens |
| `DevWorkspacesCluster` | Cluster-scoped DevWorkspace resources |
| `DockerConfig` | Container registry credentials |
| `Events` | Kubernetes events for workspaces |
| `FactoryResolver` | Factory flow state (resolving Git URLs → DevWorkspace) |
| `GitConfig` | User git config (name, email) |
| `GitOauthConfig` | OAuth provider config |
| `InfrastructureNamespaces` | Available k8s namespaces |
| `Kubeconfig` | Kubeconfig data |
| `PersonalAccessTokens` | PAT management (GitHub/GitLab/Bitbucket tokens) |
| `Plugins` | Editor plugins/extensions registry |
| `Pods` | Workspace pod data |
| `SanityCheck` | System health state |
| `ServerConfig` | Server-side configuration |
| `SshKeys` | SSH key management |
| `User` | Current authenticated user |
| `Workspaces` | DevWorkspace CRDs — main workspace state |

Store root: `store/index.ts`, root reducer: `store/rootReducer.ts`, hooks: `store/hooks.ts`

---

### Services

| Service | Purpose |
|---|---|
| `services/backend-client/` | Axios wrappers for each backend API route |
| `services/workspace-client/` | WebSocket client for real-time workspace status |
| `services/workspace-adapter/` | Adapts DevWorkspace CRDs to UI model objects |
| `services/devfile/` | Devfile parsing helpers |
| `services/devfileApi/` | Devfile API client |
| `services/factory-location-adapter/` | Parses factory Git URLs |
| `services/bootstrap/` | App initialization sequence (called before render) |
| `services/axios-wrapper/` | Axios instance with auth interceptors |
| `services/alerts/` | Alert notification helpers |
| `services/oauth/` | OAuth flow helpers |
| `services/registry/` | Devfile registry client |
| `services/resource-fetcher/` | Generic resource fetching with caching |
| `services/session/` | User session management |
| `services/session-storage/` | Session storage helpers |
| `services/tabManager/` | Browser tab management for workspace opening |
| `services/helpers/` | Misc utility functions |
| `services/models/` | Frontend model types |

---

### React Contexts

| Context | Purpose |
|---|---|
| `ThemeContext/` | Light/dark theme toggle |
| `ToggleBars/` | Sidebar/header bar toggle state |
| `UITheme/` | PatternFly theme tokens |
| `WorkspaceActions/` | Start/stop/delete action handlers — prevents duplicate confirmation modals |

---

## Backend Architecture

**Framework:** Fastify, TypeScript
**Pattern:** Each file in `routes/api/` registers GET/POST/PUT/DELETE handlers. All Kubernetes API calls go through `devworkspaceClient/` services using `@kubernetes/client-node`.

### Backend API Routes

| File | Purpose |
|---|---|
| `devworkspaces.ts` | CRUD for DevWorkspace CRDs |
| `devworkspaceTemplates.ts` | DevWorkspaceTemplate CRUD |
| `devworkspaceResources.ts` | DevWorkspace resource patch |
| `devworkspaceCluster.ts` | Cluster-scoped DevWorkspace resources |
| `editors.ts` | Available editor list |
| `gitConfig.ts` | Git config read/write |
| `gitBranches.ts` | Git branch listing |
| `sshKeys.ts` | SSH key CRUD |
| `personalAccessToken.ts` | PAT CRUD |
| `dockerConfig.ts` | Docker registry config |
| `serverConfig.ts` | Server-side config |
| `clusterConfig.ts` | CheCluster config |
| `clusterInfo.ts` | Cluster info |
| `aiConfig.ts` | AI provider config |
| `aiRegistry.ts` | AI tool registry |
| `backup.ts` | Workspace backup/restore |
| `deviceAuthToken.ts` | Device auth tokens |
| `pods.ts` | Pod status and events |
| `events.ts` | Kubernetes events |
| `kubeConfig.ts` | Kubeconfig proxy |
| `websocket.ts` | WebSocket upgrade handler |
| `dataResolver.ts` | Factory data resolution |
| `workspacePreferences.ts` | Workspace preferences |
| `podmanLogin.ts` | Container registry login |
| `sccPermission.ts` | SCC permission check (OpenShift) |
| `airGapSample.ts` | Air-gap sample data |
| `gettingStartedSample.ts` | Getting started samples |

### devworkspaceClient Services

| Service | Purpose |
|---|---|
| `gitConfigApi/` | Reads/writes git config ConfigMap |
| `logsApi/` | Streams pod logs via WebSocket |
| `personalAccessTokenApi/` | PAT Secret CRUD |
| `sshKeysApi/` | SSH key Secret CRUD |

---

## Dev Commands

```bash
# Test a specific file (fast — run before every commit)
yarn workspace @eclipse-che/dashboard-frontend test --testPathPatterns <TestFileName> --no-cache
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns <TestFileName> --no-cache

# Format + lint (run before commit)
yarn format:fix && yarn lint:fix

# Full build (run before push)
yarn build

# Full test suite (run before push)
yarn test

# Start local dev server
yarn start

# License regeneration — REQUIRED after any package.json change
yarn license:generate
```

---

## Common Issue Patterns → Where to Look

| Issue type | Start here |
|---|---|
| UI bug in workspace list | `containers/WorkspacesList/` + `pages/WorkspacesList/` |
| UI bug in workspace details | `containers/WorkspaceDetails/` + `pages/WorkspaceDetails/` |
| UI bug in user preferences | `containers/UserPreferences/` + `pages/UserPreferences/` |
| Redux state bug | `store/<SliceName>/` — check async thunk and selectors |
| Backend API bug | `routes/api/<feature>.ts` + matching `devworkspaceClient/services/` |
| CSS/styling bug | `.module.css` file alongside the component |
| Factory flow bug | `store/FactoryResolver/` + `services/factory-location-adapter/` |
| AI tools bug | `store/AiConfig/` + `routes/api/aiConfig.ts` + `routes/api/aiRegistry.ts` |
| SSH/PAT/git config bug | `store/SshKeys/` or `store/PersonalAccessTokens/` or `store/GitConfig/` |
| Workspace start/stop bug | `store/Workspaces/` + `contexts/WorkspaceActions/` |

---

## Coding Constraints — ALWAYS Enforce

- **No `any` type** — use proper types, `unknown`, or type guards
- **Absolute imports only**: `@/path/to/module` — never `./` or `../`
- **PatternFly**: import from `@patternfly/react-core` only (see context-patternfly.md)
- **EPL-2.0 copyright header** in every new source file
- **`yarn license:generate`** after any `package.json` change
- **Snapshots**: update with `--updateSnapshot` and verify the diff makes sense
