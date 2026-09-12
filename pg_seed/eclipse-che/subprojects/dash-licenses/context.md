---
repo: che-incubator/dash-licenses
default_branch: main
stack: [Java, Maven]
description: Eclipse Dash license checker wrapper — validates npm/Maven dependency licenses for EPL-2.0 compatibility
auto_approve_min_priority: major
story_point_budget: 2
local_path: .repos/che-incubator/dash-licenses
commands:
  test: "mvn test -q 2>&1 | tail -30"
  lint: "mvn checkstyle"
  format: "check -q 2>&1 | tail -20:"

---
# dash-licenses — AI Context File

> Load this file BEFORE any dash-licenses work.
> Also load: context/eclipse-che-ecosystem.md

Last commit: `1bd84e94f` · 2026-08-23 · ci: release 2.0.1
GitHub: `che-incubator/dash-licenses`

---

## Role

Wrapper CLI tool around Eclipse Dash license checker — validates npm/Maven/Python dependency licenses for EPL-2.0 compatibility. Required by all Eclipse Foundation projects. Called from che-dashboard via `yarn license:generate`.

---

## How It Is Used by che-dashboard

```bash
# In che-dashboard root — run after any package.json or yarn.lock change:
yarn license:generate

# This invokes dash-licenses to check all npm dependencies against:
# - ClearlyDefined.io (license data source)
# - Eclipse IP database

# Output:
# - .deps/dash-licenses.csv      — full dependency license report
# - .deps/EXCLUDED/dev.md        — dev deps that couldn't be resolved (manually approved)
# - .deps/EXCLUDED/prod.md       — prod deps that couldn't be resolved (manually approved)
```

**When a dep is UNRESOLVED:**
1. Visit `https://clearlydefined.io/definitions/npm/npmjs/-/<package>/<version>`
2. If definition exists: wait for ClearlyDefined to index it (can take hours/days)
3. If definition is missing: add to `.deps/EXCLUDED/dev.md` or `prod.md`:

```markdown
| `package-name@X.Y.Z` | [clearlydefined](https://clearlydefined.io/definitions/npm/npmjs/-/package-name/X.Y.Z) |
```

---

## Common Issue Types

| Issue | Where to look |
|---|---|
| New version release | Version bump + update CI/CD scripts |
| False positive license detection | License detection heuristics in source |
| Support new package registry | Registry-specific parser |
| CI integration fix | `.github/workflows/` or Maven plugin config |

---

## Build Commands

```bash
mvn clean install
mvn test
mvn clean install -DskipTests  # Skip tests for fast build
```

---

## Coding Rules

- **Java** — follow existing code style
- **EPL-2.0 copyright header** in every Java file
- **Conventional commits** + `Assisted-by:` trailer
- **Checkstyle** must pass
