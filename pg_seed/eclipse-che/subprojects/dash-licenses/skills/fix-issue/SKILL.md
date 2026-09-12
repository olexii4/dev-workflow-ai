---
name: fix-issue
description: Implement a fix for dash-licenses following Java/Maven conventions.
argument-hint: "[issue-number]"
---

# Fix dash-licenses Issue

## Required input

An issue number. `analyze-issue` must have been run first.

## Workflow

### 1. Set up the branch

```bash
cd "$LOCAL_PATH"
git checkout main
git pull origin main
git checkout -b issue-<ISSUE_NUM>
```

### 2. Implement the fix

Follow Java/Maven conventions:

- **Java 17+**, `@Inject` for DI, no wildcard imports
- **EPL-2.0 header** in every new `.java` file (see `rules/dev.md`)
- **Null safety**: use `Optional` for nullable returns
- **Specific exceptions**: catch `IOException`, `HttpResponseException` etc., not bare `Exception`

### 3. Write or update tests

For every changed class, add or update the test class in `src/test/java/`:

```bash
# Find existing test class
find src/test/java -name "*ClassName*Test.java"
```

Tests must cover the specific bug scenario as a regression test.

### 4. Run tests and checkstyle (mandatory, in order)

```bash
# Step 1: tests
mvn test -q 2>&1 | tail -30
# Fix all failures

# Step 2: checkstyle
mvn checkstyle:check -q 2>&1 | tail -20
# Fix all violations
```

### 5. Commit

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
fix(licenses): short description

Closes #<ISSUE_NUM>

Assisted-by: Claude Sonnet 4.6
Signed-off-by: $(git config user.name) <$(git config user.email)>
EOF
)"
```

### 6. Push and open PR

```bash
git push -u origin issue-<ISSUE_NUM>

gh pr create \
  --repo che-incubator/dash-licenses \
  --title "fix(licenses): short description" \
  --body "$(cat <<'EOF'
## What

<what changed and why>

## How tested

<unit tests added/updated>

Closes #<ISSUE_NUM>
EOF
)"
```

## Output

Report the PR URL and CI status.
