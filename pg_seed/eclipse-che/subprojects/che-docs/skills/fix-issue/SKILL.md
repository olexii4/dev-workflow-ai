---
name: fix-issue
description: Write or update Eclipse Che documentation following AsciiDoc/Antora conventions.
argument-hint: "[issue-number]"
---

# Fix che-docs Issue

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

### 2. Write or update AsciiDoc

Follow these conventions strictly:

**One sentence per line** — hard requirement for Antora/AsciiDoc:
```asciidoc
This is the first sentence.
This is the second sentence on its own line.
Do not put two sentences on the same line.
```

**Antora xref syntax** — never use plain URLs to other doc pages:
```asciidoc
// CORRECT
See xref:administration-guide:configuring-che.adoc[Configuring Che].

// WRONG — do not use
See link:../administration-guide/configuring-che.html[Configuring Che].
```

**No images without alt text**:
```asciidoc
// CORRECT
image::workspace-list.png[Workspace list showing three active workspaces]

// WRONG
image::workspace-list.png[]
```

**Procedure file names** — use kebab-case matching the procedure title:
- Title: `= Installing Che on OpenShift` → file: `installing-che-on-openshift.adoc`

**Navigation entry** — add to `modules/<module>/nav.adoc` if creating a new page:
```asciidoc
* xref:new-page.adoc[]
```

**Attributes** — use project attributes for product names and versions:
```asciidoc
// Use attributes, not hardcoded strings
{prod} is a cloud IDE.     // not "Eclipse Che is a cloud IDE."
{prod-ver}                  // not "7.119"
```

### 3. Run Vale linter (if installed)

```bash
# Check with Vale if available
if command -v vale &>/dev/null; then
  vale --no-wrap modules/<module>/pages/<file>.adoc
fi
```

Vale violations are advisory — fix warnings about style guide compliance where possible.

### 4. Commit

```bash
git add modules/
git commit -m "$(cat <<'EOF'
docs(<module>): short description of what was documented

Closes #<ISSUE_NUM>

Assisted-by: Claude Sonnet 4.6
Signed-off-by: $(git config user.name) <$(git config user.email)>
EOF
)"
```

Commit type is always `docs`. Subject ≤ 50 chars.

### 5. Push and open PR

```bash
git push -u origin issue-<ISSUE_NUM>

gh pr create \
  --repo eclipse-che/che-docs \
  --title "docs(<module>): short description" \
  --body "$(cat <<'EOF'
## What

<what was documented or fixed>

Closes #<ISSUE_NUM>
EOF
)"
```

## Output

Report the PR URL.
