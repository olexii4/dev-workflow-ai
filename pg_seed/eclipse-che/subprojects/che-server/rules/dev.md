# che-server Development Conventions

---

## 1. Commit Trailers

```
Assisted-by: {AGENT_NAME}
Signed-off-by: {AUTHOR_NAME} <{AUTHOR_EMAIL}>
```

No `Made-with`, no `Co-authored-by`. Subject ≤ 50 chars, conventional commits.

---

## 2. Pre-commit Checks (in order)

```bash
# 1. Checkstyle
mvn checkstyle:check -pl <changed-module>

# 2. Unit tests for changed module
mvn test -pl <changed-module> -am

# Fix all failures before committing.
```

### Pre-push (full suite)

```bash
mvn clean install
```

---

## 3. Java Rules

- **Java 17+** — use records, sealed classes, text blocks where appropriate
- **Injection**: always `@Inject` for managed beans — never `new ServiceImpl()`
- **No wildcard imports**: every import must name the class explicitly
- **EPL-2.0 header**: required in every `.java` file (see context.md for the template)
- **Typed exceptions**: use `ServerException`, `NotFoundException`, `ConflictException`, `BadRequestException` from `org.eclipse.che.api.core`
- **REST DTOs**: response objects are separate classes from domain objects — never expose domain entities directly via REST

---

## 4. Quarkus Patterns

- **CDI beans**: annotate with `@ApplicationScoped`, `@RequestScoped`, or `@Singleton` — not Spring annotations
- **Config**: use `@ConfigProperty` for environment-based config injection
- **Testing**: use `@QuarkusTest` for integration tests; `@ExtendWith(MockitoExtension.class)` for unit tests

---

## 5. Testing Conventions

- Unit tests: one test class per production class, named `<ClassName>Test`
- Mockito for mocking dependencies
- Every bug fix must include a regression test that reproduces the bug

---

## 6. Git Workflow

Branch naming: `che-<ISSUE_NUM>` or `fix/<short-description>`.

Squash before PR if multiple commits:

```bash
git reset $(git merge-base origin/main HEAD)
git add -A
git commit -m "fix(scope): description"
```
