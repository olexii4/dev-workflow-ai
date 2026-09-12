# devworkspace-operator Development Conventions

---

## 1. Commit Trailers

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

No `Made-with`, no `Co-authored-by`. Subject ≤ 50 chars, conventional commits.

---

## 2. Pre-commit Checks (in order)

```bash
# 1. Lint
golangci-lint run ./...

# 2. Tests
make test

# Fix all failures before committing.
```

### Pre-push

```bash
make build
make test
```

---

## 3. Go Rules

- **Go 1.21+** — use generics, `errors.Is`/`errors.As` for error wrapping
- **No direct pod creation**: use DevWorkspace CRD; operator manages pod lifecycle
- **Idempotent reconcilers**: every reconcile call must produce the same result if state hasn't changed
- **Error wrapping**: `fmt.Errorf("context: %w", err)` — preserve error chain
- **Context propagation**: pass `context.Context` as the first parameter to all functions that call k8s API
- **License header**: Apache 2.0 header in all new `.go` files (match existing files)

---

## 4. CRD Type Changes

After modifying types in `apis/`:

```bash
make generate manifests
```

Commit the generated files alongside the type change. Never edit generated `zz_generated_*.go` files manually.

---

## 5. Testing Conventions

- Unit tests in `*_test.go` files adjacent to the code
- Use `envtest` for controller tests (fake k8s API)
- Use `fake.NewClientBuilder()` for unit tests that don't need a real cluster
- Every controller change needs a test covering: reconcile when resource exists, reconcile when resource is deleted, error path

---

## 6. Status Conditions Pattern

Use `.status.conditions` for communicating workspace state — never ad-hoc string fields:

```go
meta.SetStatusCondition(&workspace.Status.Conditions, metav1.Condition{
    Type:    string(common.WorkspaceConditionReady),
    Status:  metav1.ConditionFalse,
    Reason:  "ProvisioningFailed",
    Message: err.Error(),
})
```
