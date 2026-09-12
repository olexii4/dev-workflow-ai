---
repo: eclipse-che/che-docs
default_branch: main
stack: [AsciiDoc, Antora, Vale]
description: Official Eclipse Che documentation site
auto_approve_min_priority: minor
story_point_budget: 1
local_path: .repos/eclipse-che/che-docs
commands:
  test: "echo 'no tests'"
  lint: "vale --config=.vale.ini modules/ 2>&1 | tail -20"

---
# che-docs — AI Context File

> Load this file BEFORE any che-docs work.
> Also load: context/eclipse-che-ecosystem.md

Last commit: `ede3e33ca` · 2026-08-13 · procedures: add Device Auth Tokens documentation
GitHub: `eclipse-che/che-docs`

---

## Role

Official Eclipse Che documentation — AsciiDoc source files built with Antora. Covers user guide, administration guide, overview, and release notes.

---

## Structure (Antora module layout)

```
che-docs/
├── antora-playbook.yml        # Antora build configuration
├── modules/
│   ├── administration-guide/  # Admin tasks (operator config, OAuth, etc.)
│   │   ├── pages/             # .adoc source files
│   │   └── partials/          # Reusable .adoc fragments
│   ├── end-user-guide/        # User-facing docs (workspaces, PATs, SSH, etc.)
│   │   ├── pages/
│   │   └── partials/
│   ├── overview/              # Eclipse Che overview, architecture
│   │   └── pages/
│   └── release-notes/         # Per-version release notes
│       └── pages/
```

---

## AsciiDoc Writing Rules

- **One sentence per line** — standard AsciiDoc/docs-as-code convention; helps diffs
- **Kebab-case file names** — e.g., `configuring-device-auth-tokens.adoc`
- **Vale linter must pass** — run `vale <file>` or `vale .` before commit
- **No images without alt text** — every `image::` must have `[alt text,...]`
- **Cross-references use Antora xref syntax**:
  ```asciidoc
  xref:end-user-guide:configuring-personal-access-tokens.adoc[Personal Access Tokens]
  ```
- **Procedure titles**: use imperative verb form — "Configuring X", "Adding Y"

---

## Common AsciiDoc Patterns

```asciidoc
= Configuring Device Auth Tokens
:description: How to configure device authorization tokens in Eclipse Che.

[role="_abstract"]
This section describes how to configure device authorization tokens for third-party services.

.Prerequisites
* An Eclipse Che instance is running.
* You have administrator access.

.Procedure
. Navigate to *User Preferences* > *Device Auth Tokens*.
. Click *Add token*.
. Enter the required fields:
** *Provider*: Select the service provider.
** *Token*: Paste the device auth token.
. Click *Save*.

.Verification
* The token appears in the *Device Auth Tokens* list.

.Additional resources
* xref:end-user-guide:configuring-personal-access-tokens.adoc[Personal Access Tokens]
```

---

## Issue Types — Always 1 Story Point

Doc issues are always max 1 story point. To find the right file:

```bash
# Search for the feature name in module pages
grep -r "device auth token\|DeviceAuthToken\|device authorization" \
  $LOCAL_PATH/modules/ \
  --include="*.adoc" -l
```

---

## Build Commands

```bash
# Build the docs site
antora antora-playbook.yml

# Validate with Vale
vale modules/end-user-guide/pages/configuring-device-auth-tokens.adoc

# Or check all files
vale modules/
```

---

## Coding Rules

- One sentence per line
- Vale linter must pass
- No images without alt text
- Antora xref for cross-references (never relative file paths)
- Conventional commits: `docs(section): description` + `Assisted-by:` trailer
