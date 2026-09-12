---
name: review-pr
description: Review an eclipse-che/che PR diff — GitHub Actions, Shell scripts, TypeScript E2E tests. Reports findings grouped by severity.
argument-hint: "[PR-number or PR-URL]"
---

# Review eclipse-che/che PR

## Required input

A PR number or URL. Fetch the diff and check against che conventions.

## Workflow

### 1. Fetch the PR diff

```bash
PR_NUM=<parse from $ARGUMENTS>
gh pr diff ${PR_NUM} --repo eclipse-che/che
gh pr view ${PR_NUM} --repo eclipse-che/che --json title,body,files
```

### 2. Check GitHub Actions workflows

- All actions pinned to a major version (`@v4`, not `@main` or SHA)
- Secrets only via `${{ secrets.NAME }}` — never hardcoded values
- `permissions:` block present and minimal
- `timeout-minutes:` set on jobs that could hang
- No `continue-on-error: true` without a comment explaining why

### 3. Check Shell scripts

- `set -e` (or `set -euo pipefail`) at the top
- All variables quoted: `"$VAR"` not `$VAR`
- `[[ ]]` used instead of `[ ]` for conditionals
- No `eval` on user-controlled input
- Functions named in `snake_case`

### 4. Check TypeScript E2E tests

- Test file placed under `tests/e2e/specs/<Suite>/`
- Uses existing page-object helpers — no raw Selenium selectors in test code
- `suite()` → `test()` structure followed
- No hardcoded timeouts shorter than existing patterns
- `npm run tsc` and `npm run lint` would pass (check for obvious TS errors)

### 5. General checks

- PR description explains what and why
- `Closes #NNN` reference present
- No secrets, tokens, or personal paths in the diff
- EPL-2.0 header in any new source files

## Output

Report findings grouped by severity:

```
## PR Review: #NNNN — <title>

### 🔴 Blocking
- <file>: <issue>

### 🟡 Should fix
- <file>: <issue>

### 🟢 Suggestions
- <file>: <issue>

**Verdict:** approve / request-changes / comment
```
