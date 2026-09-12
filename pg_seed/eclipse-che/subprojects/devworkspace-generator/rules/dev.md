# devworkspace-generator Development Conventions

---

## 1. Commit Trailers

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

Subject ≤ 50 chars, conventional commits.

---

## 2. Pre-commit Checks (in order)

```bash
# 1. Tests
yarn test --testPathPatterns="<changed-file>" --no-cache

# 2. Format
yarn format:fix

# 3. Lint
yarn lint:fix
```

### Pre-push

```bash
yarn build && yarn test
```

---

## 3. TypeScript Rules

- **Strict mode**: no `any`, no `as any`
- **No relative imports** between source files: use module-relative paths or index re-exports
- **EPL-2.0 or Apache 2.0 header** in new source files — match the license used in existing files

---

## 4. Testing Conventions

- Add Devfile fixture in `tests/fixtures/` for any new Devfile component type or edge case
- Test file names match source file names: `generate.spec.ts` tests `generate.ts`
- Every bug fix must include a regression test with the failing Devfile as a fixture

---

## 5. Devfile Spec Compliance

Generated DevWorkspace CRs must be valid against the `devfile/api` CRD schema. When in doubt:

```bash
# Validate a generated CR against the CRD schema
kubectl apply --dry-run=client -f <generated-cr.yaml>
```
