# che-docs Development Conventions

---

## 1. Commit Trailers

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

Subject ≤ 50 chars. Use `docs(section): description`.

---

## 2. Pre-commit Checks

```bash
# Lint changed .adoc files
vale modules/<changed-path>/

# Build to catch broken xrefs
antora antora-playbook.yml
```

Fix all Vale errors and broken xrefs before committing.

---

## 3. AsciiDoc Rules

- **One sentence per line**: wrap at each sentence — do not wrap mid-sentence
- **xref for internal links**: `xref:module:page.adoc[link text]` — never raw doc URLs
- **No images without alt text**: `image::file.png[alt="description of image"]`
- **Procedure format**: use numbered list `.` syntax for steps; `+` continuation for code blocks under a step
- **Admonitions**: `[NOTE]`, `[WARNING]`, `[IMPORTANT]` with `====` block

---

## 4. Vale Linter

Vale enforces Red Hat documentation style. Common rules:

- Avoid passive voice
- Use present tense for procedures
- Specific terminology (check `.vale.ini` for word substitutions)

Run before every commit:

```bash
vale modules/
```

---

## 5. Story Points

Doc-only changes are capped at **1 story point** regardless of file count. Documentation changes do not affect runtime behavior and have lower risk.

---

## 6. PR Conventions

- Title: `docs(section): what was added/fixed`
- Link the issue: `Closes #NNNN`
- Note which version the docs apply to (if version-specific)
