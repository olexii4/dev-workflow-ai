---
repo: devfile/devworkspace-operator
default_branch: main
stack: [Go, Operator SDK, kubebuilder, Kubernetes]
description: Kubernetes operator that manages DevWorkspace CRDs — starts/stops workspace pods
auto_approve_min_priority: critical
story_point_budget: 2
local_path: .repos/devfile/devworkspace-operator
commands:
  test: "make test 2>&1 | tail -30"
  lint: "make lint 2>&1 | tail -20"

---
# devworkspace-operator — AI Context File

> Load this file BEFORE any devworkspace-operator implementation work. Read it with the Read tool — do NOT traverse source dirs.
> Also load: context/eclipse-che-ecosystem.md

Last commit: `943ae8e46` · 2026-04-15 · fix: fall back to canonical backup auth secret name on restore
GitHub: `devfile/devworkspace-operator`

---

## Role

Kubernetes operator (Go + Operator SDK / kubebuilder) that manages DevWorkspace custom resources — starts/stops workspace pods, manages routing, handles backup/restore. Consumed by both Eclipse Che and standalone Devfile workflows.

---

## Directory Structure

```
devworkspace-operator/
├── apis/
│   └── controller/v1alpha1/       # CRD type definitions (Go structs)
│       ├── devworkspace_types.go   # DevWorkspace spec/status
│       ├── devworkspacetemplate_types.go
│       └── devworkspacerouting_types.go
│
├── controllers/
│   ├── workspace/                  # Main DevWorkspace reconciler
│   │   ├── devworkspace_controller.go  # Entry point — Reconcile() function
│   │   ├── internal/               # Reconcile sub-steps
│   │   │   ├── provision/          # Container, volume, routing provisioning
│   │   │   └── ...
│   │   └── metrics/                # Prometheus workspace metrics
│   ├── controller/
│   │   └── devworkspacerouting/    # DevWorkspaceRouting reconciler
│   ├── backupcronjob/              # Backup CronJob controller
│   └── cleanupcronjob/             # Cleanup stale resources controller
│
├── build/
│   ├── bin/                        # Compiled binary output
│   ├── make/                       # Makefile includes (targets split by concern)
│   └── scripts/                    # Deploy/bundle helper scripts
│
└── deploy/
    ├── bundle/
    │   ├── manifests/              # OLM CSV + CRD manifests
    │   └── metadata/               # OLM metadata
    └── deployment/
        └── kubernetes/             # Raw K8s YAML (for non-OLM installs)
```

---

## Key CRDs

### DevWorkspace

```yaml
spec:
  template:          # DevWorkspaceTemplate spec (containers, volumes, etc.)
  started: true      # Set to false to stop the workspace
  routingClass: ""   # Optional routing class override
status:
  phase: Running     # Stopped | Starting | Running | Failed | Terminating
  message: ""        # Human-readable status message
  devworkspaceId: "" # Unique ID
  conditions: []     # List of conditions (type, status, reason, message)
  mainUrl: ""        # URL to access the workspace IDE
```

### DevWorkspaceTemplate

Reusable workspace template — embedded in DevWorkspace.spec.template or referenced by name.

### DevWorkspaceRouting

Created by the operator when a workspace starts — configures ingress/route for the workspace.

---

## Reconciler Pattern (main workspace controller)

```go
func (r *DevWorkspaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. Fetch the DevWorkspace CR
    workspace := &devworkspacev1alpha1.DevWorkspace{}
    if err := r.Get(ctx, req.NamespacedName, workspace); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 2. Check started/stopped state
    if !workspace.Spec.Started {
        return r.stopWorkspace(ctx, workspace)
    }

    // 3. Run provisioning steps (order matters)
    // - Check namespace/RBAC
    // - Provision containers, volumes
    // - Create routing (DevWorkspaceRouting CR)
    // - Wait for pod to be Running
    // - Update status

    // 4. Update .Status with conditions
    workspace.Status.Phase = devworkspacev1alpha1.DevWorkspaceStatusRunning
    return ctrl.Result{}, r.Status().Update(ctx, workspace)
}
```

---

## Common Issue Areas → Where to Look

| Issue type | Start here |
|---|---|
| Backup/restore bug | `controllers/workspace/internal/` — search for "backup" or "restore" |
| Auth secret name | `controllers/workspace/internal/` — search for "auth secret" |
| Routing bug | `controllers/controller/devworkspacerouting/` |
| Status conditions not updating | `controllers/workspace/devworkspace_controller.go` — look for `.Status.Conditions` |
| Finalizer handling | Search for `controllerutil.AddFinalizer` / `controllerutil.RemoveFinalizer` |
| Workspace not starting | `controllers/workspace/internal/provision/` |
| Workspace metrics | `controllers/workspace/metrics/` |
| CRD schema change | `apis/controller/v1alpha1/` + run `make generate` |

---

## Build + Test Commands

```bash
make build          # Compile binary to build/bin/
make test           # Run unit tests
make lint           # Run golangci-lint
make generate       # Regenerate CRD manifests from Go type annotations
make bundle         # Build OLM bundle (deploy/bundle/)
make deploy         # Deploy to current kubeconfig cluster
make undeploy       # Remove from cluster

# Run a specific test
go test ./controllers/workspace/... -run TestBackupSecretName -v
```

---

## Coding Rules

- **Go 1.21+**
- **All errors must be checked** — never use `_` to discard errors
- **`context.Context` propagation** — pass ctx to all API calls
- **No goroutine leaks** — goroutines must have exit conditions
- **golangci-lint must pass** — run `make lint` before commit
- **Unit tests for every controller change** — use `envtest` for controller tests
- **Status conditions**: always set `type`, `status`, `reason`, `message` — never leave fields empty
- **Events**: record events for meaningful state transitions (`r.Recorder.Event(...)`)
- **Generation check**: use `observedGeneration` to prevent infinite reconcile on status-only writes
- **Owner references**: set on all child resources so they are GC'd when parent is deleted
- **Conventional commits** + `Assisted-by:` trailer

---

## Status Condition Pattern

```go
meta.SetStatusCondition(&workspace.Status.Conditions, metav1.Condition{
    Type:               "Ready",
    Status:             metav1.ConditionFalse,
    Reason:             "BackupSecretNotFound",
    Message:            fmt.Sprintf("backup auth secret %q not found in namespace %q", secretName, namespace),
    ObservedGeneration: workspace.Generation,
})
```

---

## Finalizer Pattern

```go
const workspaceFinalizer = "controller.devfile.io/workspace-finalizer"

// Add finalizer on create
if !controllerutil.ContainsFinalizer(workspace, workspaceFinalizer) {
    controllerutil.AddFinalizer(workspace, workspaceFinalizer)
    return ctrl.Result{}, r.Update(ctx, workspace)
}

// Remove finalizer after cleanup
if !workspace.DeletionTimestamp.IsZero() {
    if err := r.cleanupResources(ctx, workspace); err != nil {
        return ctrl.Result{}, err
    }
    controllerutil.RemoveFinalizer(workspace, workspaceFinalizer)
    return ctrl.Result{}, r.Update(ctx, workspace)
}
```
