---
name: fix-issue
description: Implement a fix for a devworkspace-operator issue following Go/Operator SDK conventions.
argument-hint: "[issue-number]"
---

# Fix devworkspace-operator Issue

## Required input

An issue number. `analyze-issue` must have been run first.

## Workflow

### 1. Verify scope is known

Confirm affected Go files, root cause, and story points are known from analyze-issue output.

### 2. Set up the branch

```bash
cd "$LOCAL_PATH"
git checkout main
git pull origin main
git checkout -b issue-<ISSUE_NUM>
```

### 3. Implement the fix

Follow Go/Operator SDK conventions strictly:

- **All errors checked** — never `_` for an error value
- **context.Context propagated** — every function that calls I/O must accept and pass `ctx context.Context`
- **Proper defer** — `defer cancel()` after `context.WithTimeout`, `defer file.Close()` after open
- **No goroutine leaks** — goroutines started must have a clear termination condition
- **EPL-2.0 header** in every new `.go` file:

```go
//
// Copyright (c) 2019-2026 Red Hat, Inc.
// Licensed under the Eclipse Public License 2.0 which is available at
// https://www.eclipse.org/legal/epl-2.0/
//
// SPDX-License-Identifier: EPL-2.0
//
// Contributors:
//   Red Hat, Inc. - initial API and implementation
//
```

- **Status conditions**: always set `Type`, `Status`, `Reason`, and `Message` fields
- **Events**: record only for meaningful transitions, not every reconcile tick
- **Owner references**: set on child resources so GC removes them with parent

### 4. If CRD schema changed

```bash
# Regenerate deepcopy and manifests
make generate
make bundle
```

Verify the updated CRD YAML in `deploy/bundle/manifests/` makes sense.

### 5. Run tests and lint

```bash
# Run all tests
make test 2>&1 | tail -30
# Fix all failures

# Run linter
make lint 2>&1 | tail -20
# Fix all golangci-lint violations
```

### 6. Commit

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
fix(controller): short description of what was fixed

Closes #<ISSUE_NUM>

Assisted-by: Claude Sonnet 4.6
Signed-off-by: $(git config user.name) <$(git config user.email)>
EOF
)"
```

### 7. Push and open PR

```bash
git push -u origin issue-<ISSUE_NUM>

gh pr create \
  --repo devfile/devworkspace-operator \
  --title "fix(controller): short description" \
  --body "$(cat <<'EOF'
## What

<what changed and why>

## How tested

<unit tests added/updated>

Closes #<ISSUE_NUM>
EOF
)"
```

### 8. Monitor CI

```bash
gh pr checks <PR_NUM> --repo devfile/devworkspace-operator --watch
```

## Output

Report the PR URL and CI status.
