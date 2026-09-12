# Issue Description Quality — Implementation Readiness Rules

Derived from analysis of 50 closed CRW issues (July–September 2026) assigned to Oleksii Orel.
35 CVE dependency issues + 15 non-CVE bugs/features/accessibility issues were reviewed.

---

## TL;DR Decision Table

| Issue type | Minimum to be implementable | Strong blockers |
|---|---|---|
| CVE | Package name in summary + `CVE-YYYY-NNNNN` label | None — always has enough info |
| Bug | Steps to reproduce (filled) + expected vs actual | Empty template placeholders, <100 chars |
| Feature | What is missing + comparison to existing feature | No context of what already exists |
| Accessibility | WCAG criterion + what the gap is | Template not filled in |
| Validation | Reference to implementation issue | Is a validation ticket, not for implementation |

---

## 1. CVE Issues

### Pattern

Every CVE issue in the CRW project follows this structure:

```
Summary: CVE-YYYY-NNNNN devspaces/dashboard-rhel9: <package>: <attack-type> [rhos_devspaces-X.YY]
Labels:  CVE-YYYY-NNNNN, Security, SecurityTracking, Unplanned, flaw:bz#NNNNNNN,
         pscomponent:devspaces/dashboard-rhel9
```

### Implementability

CVE issues are **always implementable**. The fix approach is deterministic:

1. Extract package name from summary (e.g. `js-yaml`, `axios`, `qs`, `fast-uri`)
2. Find which version fixes the CVE (check `flaw:bz#NNNNNNN` link or CVE advisory)
3. Run `yarn upgrade <package>@<fixed-version>` in the repo
4. Run `yarn license:generate` (package.json changes → always required)
5. Update `.deps/EXCLUDED/` if `yarn license:generate` exits with UNRESOLVED

### Signals that tell you the package to upgrade

| Label field | What it tells you |
|---|---|
| Summary `<package>:` | Exact npm package name |
| `flaw:bz#NNNNNNN` | Red Hat BZ ticket with fixed version and patch |
| `CVE-YYYY-NNNNN` label | CVE advisory page with affected/fixed version range |
| `pscomponent:devspaces/dashboard-rhel9` | Confirms target is che-dashboard |

### Examples (always implementable)

- `CRW-12794`: `js-yaml` DoS → `yarn upgrade js-yaml` + license:generate
- `CRW-12588`: `axios` DoS → upgrade axios, check resolutions
- `CRW-12154`: `postcss` info disclosure → upgrade postcss

---

## 2. Bug Issues

### Minimum viable description (all three required)

1. **Steps to reproduce** — filled in (not template placeholder `# <steps>`)
2. **Expected behavior** — what should happen
3. **Actual behavior** — what actually happens, ideally with error message

### Strong positive signals (add confidence)

| Signal | Why it helps |
|---|---|
| Error message pasted verbatim from terminal | Tells you exactly what error to fix and where |
| Specific version (`DS 3.28.0-RC.18.05`) | Lets you check git blame, find regression commit |
| Specific URL format that triggers the bug | Gives a deterministic repro (e.g. `repo.git?devfilePath=x`) |
| BZ or external reference with patch details | Provides a fix to compare against |
| Acceptance criteria with Definition of Done | Tells you when to stop |

### Implementable examples

- **CRW-10861** (1364c): Factory link devfilePath ignored → steps with exact factory URL format, expected vs actual, acceptance criteria → CLEAR fix scope
- **CRW-10950** (1216c): Duplicate workspace for GitHub URL with branch → specific URL format (`/tree/<branch>`), version pinned, clear behavior diff
- **CRW-11980** (590c): Automatic podman login fails → steps (configure → start workspace → pull), terminal error verbatim
- **CRW-12731** (619c): Workspace reuse ignores toggled "Create New" → steps with UI flow, expected (two workspaces) vs actual (redirect)

### Risky / not implementable examples

- **CRW-11955** (15c): "Empty workspace missing" → description says only "Upstream issue:" with no content → **STOP, do not implement**
- **CRW-11728** (387c): "Podman tests fail because of wrong user" → error message present but fix direction says "Might be related to" → insufficient diagnosis
- **CRW-11516** (493c): UI alignment issue → template present but steps field says `# <steps>` (not filled) → insufficient repro

### Red flags — do not implement

- Description length < 100 characters (excluding template boilerplate)
- Steps field contains `# <steps>` (unfilled template)
- Actual/Expected fields are empty lines in template
- Description is only a link: "Upstream issue:", "See: https://..."
- Diagnosis uses hedging language: "Might be related to", "Could be", "Not sure"

---

## 3. Feature / Enhancement Issues

### Minimum viable description

1. **What currently exists** — reference to the page, component, or workflow that already works
2. **What is missing** — explicit gap between current and desired state
3. **User need** — why users need this (avoids over-engineering)

### Strong positive signals

| Signal | Why it helps |
|---|---|
| Comparison to similar existing feature | Gives you the implementation pattern to follow |
| Specific UI location (`User Preferences → Git Services`) | Tells you exactly where to add the feature |
| Acceptance criteria / Definition of Done | Tells you when to stop |

### Implementable example

- **CRW-11582** (451c): Device Authentication token management from Dashboard → describes existing token management in workspace command palette, describes gap (no Dashboard equivalent), names the existing similar section (User Preferences → PATs) → clear implementation target even without steps

### Not immediately implementable

- Feature requests with only a one-line title and no body
- Requests referencing an external issue or design doc that is not publicly accessible

---

## 4. Accessibility Issues

### Minimum viable description

1. **WCAG criterion reference** — e.g. "2.2.2 Pause, Stop, Hide (Level A)"
2. **Gap description** — what control or behavior is missing
3. **Workaround** — what users do today (informs the fix scope)

### Example

- **CRW-10283** (1200c): Logs auto-scroll cannot be stopped → WCAG 2.2.2 cited, gap is missing "Stop" button, workaround is manual scroll → clear fix: add a Pause/Stop control

---

## 5. Validation Issues

Validation issues (label `validated-functionality`, title starts with `[Validate]`) are **not implementation issues** — they verify an already-merged fix. The `filter-issues` skill should skip them.

Identifying signals:
- Title starts with `[Validate]`
- Body says "Please perform the following validation steps"
- References another issue with "Validation for: CRW-NNNNN"

---

## 6. Scoring Adjustment

Adjust `filter-issues` score based on description quality:

| Condition | Adjustment |
|---|---|
| Bug: has steps + expected/actual + error output | +0 (no change — already scored) |
| Bug: has steps + expected/actual, no error output | -1 (can likely still implement) |
| Bug: missing steps OR missing expected/actual | -3 (risky, may block at Analyze phase) |
| Bug: empty description (<100 chars) | Disqualify (hard filter) |
| Bug: template placeholders not filled | -3 |
| Feature: has comparison to existing + UI location | +1 |
| Feature: vague ("add X to Y") with no context | -2 |
| CVE: package name in summary + CVE-ID label | +2 (always implementable) |

---

## 7. Pre-Implementation Checklist

Before starting implementation, verify:

- [ ] Description is not empty and not template-only
- [ ] For bugs: steps are filled in (not `# <steps>`)
- [ ] For bugs: expected behavior is stated
- [ ] For CVEs: package name extractable from summary
- [ ] Issue is not a validation issue (`[Validate]` title)
- [ ] External links in description are accessible (not internal-only)
- [ ] Story points ≤ session budget (3 SP default)
