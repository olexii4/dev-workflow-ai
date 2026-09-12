---
name: run-loop
description: Full autonomous loop for one issue: pick → analyze → implement → PR → monitor feedback. Entry point for the dev-workflow-ai bot. Run with /run-loop <project-name>.
argument-hint: "[project-name] (e.g., che-dashboard, che-server, devworkspace-operator)"
---

# Run Loop

## Purpose

Executes the full autonomous contribution cycle for one issue in the specified Eclipse Che subproject. Each invocation handles exactly one issue within the session's story-point budget.

## Required input

A project name matching a key in `rules.json` → `projects`. If `$ARGUMENTS` is empty, ask the user.

## Workflow

### Phase 1: Load Context

```bash
# 1. Load ecosystem knowledge
cat ./context/eclipse-che-ecosystem.md

# 2. Load project-specific context
cat ./projects/$ARGUMENTS/context.md

# 3. Load project rules
cat ./projects/$ARGUMENTS/rules/dev.md

# 4. Load project config from rules engine
cat ./rules.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['projects']['$ARGUMENTS'], indent=2))"
```

Do not proceed to Phase 2 until all four files are read.

### Phase 2: Pick Issue

Run the `pick-issue` skill:

```
/pick-issue $ARGUMENTS
```

If no eligible issues are found (all above budget, all assigned, or list empty), stop and report:

```
No eligible issues found for <project> within 3-point budget.
Reasons: [list why top candidates were excluded]
```

### Phase 3: Analyze Issue

Run the project-specific analyze-issue skill:

```
/analyze-issue <issue-number>
```

(Skill is at `projects/$ARGUMENTS/skills/analyze-issue/SKILL.md`)

If the issue is not reproducible or scope is unclear, stop and report:

```
Issue #NNNN cannot be implemented: <reason>.
Recommendation: add more info to the issue or skip to next candidate.
```

### Phase 4: Implement Fix

Run the project-specific fix-issue skill:

```
/fix-issue <issue-number>
```

(Skill is at `projects/$ARGUMENTS/skills/fix-issue/SKILL.md`)

This creates a branch, implements the fix, runs tests/lint, commits, and opens a PR.

### Phase 5: Monitor CI

```bash
# Get the PR number from the previous step
PR_NUM=<from fix-issue output>
REPO=<from rules.json>

# Watch CI
gh pr checks ${PR_NUM} --repo ${REPO} --watch
```

If CI passes: proceed to Phase 6.

If CI fails:
1. Fetch the failure log: `gh run view --log-failed`
2. Diagnose the failure
3. Apply the fix as a new commit (do NOT amend after push)
4. Re-run `gh pr checks --watch`
5. Repeat up to 3 times — if still failing after 3 attempts, report and stop

### Phase 6: Monitor Review

```bash
# Check for review comments (poll once)
gh pr view ${PR_NUM} --repo ${REPO} --json reviews,comments
```

If review comments exist, run fix-pr-feedback:

```
/fix-pr-feedback <PR_NUM>
```

(Shared skill or project-specific if available)

### Phase 7: Report

```
## Loop Complete

**Project:** che-dashboard
**Issue:** #1234 — Fix workspace not starting after network timeout
**PR:** #5678 — https://github.com/eclipse-che/che-dashboard/pull/5678
**CI:** passing ✓
**Review:** pending / 2 comments addressed
**Story points used:** 2 / 3 budget

**Session complete.** Next run: /run-loop che-dashboard
```

---

## Abort Conditions

Stop the loop immediately and report if:
- No eligible issues found (Phase 2)
- Issue cannot be analyzed/reproduced (Phase 3)
- CI fails after 3 fix attempts (Phase 5)
- Implementing the fix would exceed the story-point budget

Never silently skip a failure — always report what happened and why the loop stopped.
