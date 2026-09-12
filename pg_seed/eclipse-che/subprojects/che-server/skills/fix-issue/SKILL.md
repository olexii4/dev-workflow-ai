---
name: fix-issue
description: Implement a fix for a che-server issue. Creates a branch, applies the fix following Java/Maven conventions, runs tests and checkstyle, opens a PR.
argument-hint: "[issue-number]"
---

# Fix che-server Issue

## Required input

An issue number. `analyze-issue` must have been run first — affected module, root cause, and story points must be known.

## Workflow

### 1. Verify scope is known

Confirm from the analyze-issue output:
- Affected Maven module(s) are listed (e.g. `wsmaster/che-core-api-impl`)
- Root cause hypothesis is stated
- Story points ≤ session budget

If analyze-issue was not run, stop and run it first.

### 2. Set up the branch

```bash
cd "$LOCAL_PATH"
git checkout main
git pull origin main
git checkout -b che-<ISSUE_NUM>
```

### 3. Implement the fix

Follow Java/Maven conventions strictly:

- **Java 17+** — use modern Java features (records, sealed classes, switch expressions) where appropriate
- **`@Inject` for dependencies** — never use `new` for injectable components
- **No wildcard imports** — `import com.foo.Bar` not `import com.foo.*`
- **EPL-2.0 header** in every new `.java` file:

```java
/*
 * Copyright (c) 2012-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
```

- **Exception handling**: catch specific exceptions, not bare `Exception`
- **Null safety**: use `Optional` for nullable returns in new code

### 4. Write or update tests

For every changed class, add or update the corresponding test class:

```
wsmaster/che-core-api-impl/src/test/java/.../<ClassName>Test.java
```

Tests must cover:
- The bug scenario (regression test)
- Happy path if new behavior was added
- Edge cases identified in the issue

### 5. Run tests and checkstyle

```bash
# Run tests for the affected module only
mvn test -pl <module-path> -q 2>&1 | tail -30
# Fix all failures before proceeding

# Run checkstyle
mvn checkstyle:check -pl <module-path> -q 2>&1 | tail -20
# Fix all checkstyle violations
```

Example module paths:
- `wsmaster/che-core-api-impl`
- `core/che-core-api-core`
- `infrastructures/kubernetes`

### 6. Commit

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
fix(scope): short description of what was fixed

Closes #<ISSUE_NUM>

Assisted-by: Claude Sonnet 4.6
Signed-off-by: $(git config user.name) <$(git config user.email)>
EOF
)"
```

Conventional commit types: `fix`, `feat`, `chore`, `refactor`, `test`. Subject ≤ 50 chars.

### 7. Push and open PR

```bash
git push -u origin che-<ISSUE_NUM>

gh pr create \
  --repo eclipse-che/che-server \
  --title "fix(scope): short description" \
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
gh pr checks <PR_NUM> --repo eclipse-che/che-server --watch
```

## Output

Report the PR URL and CI status.
