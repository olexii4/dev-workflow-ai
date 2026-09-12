# dash-licenses — Development Conventions

## Purpose

dash-licenses wraps the Eclipse Dash license checker CLI to validate npm/Maven/Python
dependency licenses for EPL-2.0 compatibility. It is called by che-dashboard via
`yarn license:generate` and produces `.deps/` output files listing resolved and
unresolved dependency licenses.

## Build Commands

```bash
# Build
mvn clean install

# Build skipping tests
mvn clean install -DskipTests

# Run tests only
mvn test

# Checkstyle check
mvn checkstyle:check
```

## Coding Standards

- **Java 17+** — modern Java features permitted
- **EPL-2.0 copyright header** in all new `.java` files:

```java
/*
 * Copyright (c) 2020-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
```

- **No wildcard imports** — `import com.foo.Bar` not `import com.foo.*`
- **`@Inject` for dependency injection** — never `new` for injectable components
- **Checkstyle must pass** before committing

## Commit Conventions

- Subject: `fix(scope): description` or `feat(scope): description` (≤ 50 chars)
- Required trailer: `Assisted-by: {AGENT_NAME}`
- Forbidden trailers: `Made-with`, `Co-authored-by`
- Signed-off-by required: `Signed-off-by: Name <email>`

## Release

Releases are managed via GitHub Actions CI. The version is set in `pom.xml`. After merge, CI builds and publishes to the Eclipse Che npm registry.
