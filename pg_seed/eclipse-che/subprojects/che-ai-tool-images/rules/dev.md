# che-ai-tool-images Development Conventions

---

## 1. Commit Trailers

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

Subject ≤ 50 chars. Common types: `chore` (version bump), `fix` (broken build), `feat` (new tool).

---

## 2. Dockerfile Rules

- **Multi-arch always**: every Dockerfile must produce a working image for both `linux/amd64` and `linux/arm64`
- **Pin all versions**: no `:latest` tags in `FROM` — pin the base image digest or version tag
- **Pin tool downloads**: use version-specific download URLs, not redirecting `/latest/` URLs
- **Verify downloads**: prefer checksums or version-pinned URLs
- **Minimal layers**: combine `RUN` commands to reduce layer count

### Multi-arch pattern

```dockerfile
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "amd64" ]; then \
      curl -fsSL https://example.com/tool-linux-amd64 -o /usr/local/bin/tool; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
      curl -fsSL https://example.com/tool-linux-arm64 -o /usr/local/bin/tool; \
    fi && chmod +x /usr/local/bin/tool
```

---

## 3. CHANGELOG Format

Every version bump must add an entry to the tool's `CHANGELOG.md`:

```markdown
## [1.2.3] - 2026-09-06

### Changed
- Bump opencode from 1.2.2 to 1.2.3
```

---

## 4. Adding a New Tool

1. Create `<tool-name>/Dockerfile`
2. Create `<tool-name>/CHANGELOG.md`
3. Add a build job to `.github/workflows/` (copy existing pattern)
4. Document the tool in root `README.md`
5. PR title: `feat(<tool-name>): add <tool-name> AI tool image`

---

## 5. Testing Before PR

Build locally for both architectures:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t test/<tool-name>:latest <tool-name>/
```

Run the binary to confirm it works:

```bash
docker run --rm --platform linux/amd64 test/<tool-name>:latest <tool-binary> --version
docker run --rm --platform linux/arm64 test/<tool-name>:latest <tool-binary> --version
```
