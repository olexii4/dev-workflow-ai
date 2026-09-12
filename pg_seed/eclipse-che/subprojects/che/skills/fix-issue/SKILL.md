---
name: fix-issue
description: Implement a fix for an eclipse-che/che issue. Creates a branch, applies the fix (GitHub Actions, Shell, or TypeScript E2E), runs relevant checks, opens a PR.
argument-hint: "[issue-number]"
---

# Fix eclipse-che/che Issue

## Required input

An issue number. `analyze-issue` must have been run first — affected area, root cause, and story points must be known.

## Workflow

### 1. Verify scope is known

Confirm:
- Affected files are listed
- Root cause hypothesis is stated
- Story points ≤ session budget

### 2. Set up the branch

```bash
cd "$LOCAL_PATH"
git checkout main
git pull origin main
git checkout -b che-<ISSUE_NUM>
```

### 3. Apply the fix

**GitHub Actions / Shell:**
- Use `actions/checkout@v4`, `actions/setup-node@v4` (pinned major versions)
- All secrets via `${{ secrets.NAME }}`, never hardcoded
- Shell: `set -e` at top, quote all variables, use `[[ ]]` not `[ ]`

**E2E tests (TypeScript/Mocha):**
- File under `tests/e2e/specs/<Suite>/`
- Use existing page-object helpers from `tests/e2e/pageobjects/`
- Follow existing test structure: `suite()` → `test()` blocks
- Run lint before committing: `cd tests/e2e && npm run lint`
- Run type check: `cd tests/e2e && npm run tsc`

### 4. Run checks

```bash
# E2E TypeScript
cd tests/e2e && npm run tsc && npm run lint

# Shell scripts
shellcheck <script>.sh  # if shellcheck is available

# YAML lint for workflows
yamllint .github/workflows/<file>.yml  # if yamllint is available
```

### 5. Commit

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
fix(scope): short description

Closes #<ISSUE_NUM>

Assisted-by: Claude Sonnet 4.6
Signed-off-by: $(git config user.name) <$(git config user.email)>
EOF
)"
```

### 6. Push and open PR

```bash
git push -u origin che-<ISSUE_NUM>

gh pr create \
  --repo eclipse-che/che \
  --title "fix(scope): short description" \
  --body "$(cat <<'EOF'
## What

<what changed and why>

## How tested

<describe the test or CI job that covers this>

Closes #<ISSUE_NUM>
EOF
)"
```

### 7. Monitor CI

```bash
gh pr checks <PR_NUM> --repo eclipse-che/che --watch
```

## Output

Report the PR URL and CI status.
