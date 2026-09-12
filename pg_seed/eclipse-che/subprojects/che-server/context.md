---
repo: eclipse-che/che-server
default_branch: main
stack: [Java, Maven, Tomcat]
description: Che server backend — Kubernetes integration, user management, workspace lifecycle, OAuth
auto_approve_min_priority: major
story_point_budget: 3
local_path: .repos/eclipse-che/che-server
commands:
  test: "mvn test -q 2>&1 | tail -30"
  lint: "mvn checkstyle"
  format: "check -q 2>&1 | tail -20:"

---
# che-server — AI Context File

> Load this file BEFORE any che-server implementation work. Read it with the Read tool — do NOT traverse src/.
> Also load: context/eclipse-che-ecosystem.md

Last commit: `cb5afc8de1` · 2026-07-24 · feat(oauth): expose clientId in OAuthAuthenticatorDescriptor
GitHub: `eclipse-che/che-server`

---

## Role

Java/Maven multi-module backend — Kubernetes integration, user management, workspace lifecycle, OAuth, multi-user support. Deployed as a WAR on Tomcat inside a Kubernetes pod.

---

## Maven Module Structure

```
che-server/
├── core/                          # Base API contracts and framework
│   ├── che-core-api-core          # JAX-RS filters, request context, base API framework
│   ├── che-core-api-dto           # DTO serialization framework
│   ├── che-core-api-dto-maven-plugin  # Generates DTOs from interfaces
│   ├── che-core-api-model         # Core domain model interfaces
│   ├── che-core-logback           # Logging configuration (Logback)
│   ├── che-core-metrics-core      # Prometheus metrics base
│   ├── che-core-tracing-core      # Distributed tracing base (OpenTelemetry)
│   └── che-core-tracing-web       # Web tracing integration
│
├── wsmaster/                      # Workspace master — main business logic
│   ├── che-core-api               # Workspace API (DTOs, interfaces, JAX-RS endpoints)
│   ├── che-core-api-impl          # Workspace API implementation
│   └── che-server-kubernetes      # Kubernetes workspace implementation (most code here)
│
├── infrastructures/
│   ├── kubernetes/                # Kubernetes infrastructure (pod creation, routing)
│   └── openshift/                 # OpenShift-specific extensions (Routes, SCC)
│
├── multiuser/                     # Multi-user extensions
│
├── assembly/                      # WAR packaging
│   ├── assembly-wsmaster-war      # Main WAR (deployed to Kubernetes)
│   ├── assembly-che-tomcat        # Tomcat distribution packaging
│   ├── assembly-main              # Full distribution assembly
│   ├── assembly-root-war          # Root WAR
│   └── assembly-swagger-war       # Swagger UI WAR
│
└── typescript-dto/                # TypeScript DTO generation (shared with dashboard)
```

---

## Key Java Packages

| Package | Location | Purpose |
|---|---|---|
| `org.eclipse.che.api.workspace.*` | `wsmaster/che-core-api/` | Workspace lifecycle, status, DTOs |
| `org.eclipse.che.api.user.*` | `wsmaster/` | User management |
| `org.eclipse.che.api.oauth.*` | `wsmaster/che-core-api/` | OAuth provider integration, token management |
| `org.eclipse.che.api.factory.*` | `wsmaster/` | Factory API (create workspace from URL) |
| `org.eclipse.che.workspace.infrastructure.kubernetes.*` | `infrastructures/kubernetes/` | K8s pod provisioning, routing |
| `org.eclipse.che.workspace.infrastructure.openshift.*` | `infrastructures/openshift/` | OCP-specific overrides |

---

## Common Issue Areas → Where to Look

| Issue type | Start here |
|---|---|
| OAuth bug (token, clientId) | `wsmaster/che-core-api/src/main/java/org/eclipse/che/api/oauth/` |
| Workspace lifecycle | `infrastructures/kubernetes/src/main/java/org/eclipse/che/workspace/infrastructure/kubernetes/` |
| User management | `wsmaster/che-core-api-impl/src/main/java/org/eclipse/che/api/user/server/` |
| Factory flow | `wsmaster/che-core-api/src/main/java/org/eclipse/che/api/factory/` |
| REST endpoint | Search for `@Path`, `@GET`, `@POST` — most in `wsmaster/che-core-api/` |
| DTO shape | `wsmaster/che-core-api/src/main/java/org/eclipse/che/api/*/shared/dto/` |

---

## Build Commands

```bash
# Build all modules (skip tests — fastest)
mvn clean install -DskipTests

# Build specific module only
mvn clean install -DskipTests -pl wsmaster/che-core-api-impl

# Build with dependencies of a module
mvn clean install -DskipTests -pl wsmaster/che-core-api-impl -am

# Run tests for specific module
mvn test -pl wsmaster/che-core-api-impl

# Checkstyle (must pass before PR)
mvn checkstyle:check

# Run a specific test class
mvn test -pl wsmaster/che-core-api-impl -Dtest=OAuthAuthenticatorTest
```

---

## Coding Rules

- **Java 17+** — use records, sealed classes, text blocks where appropriate
- **`@Inject`** (from `jakarta.inject` or `javax.inject`) for dependency injection — never `new` for services
- **No wildcard imports** (`import org.eclipse.che.api.*` is forbidden)
- **EPL-2.0 copyright header** in every Java file
- **Checkstyle must pass** — run `mvn checkstyle:check` before commit
- **Unit tests** for every new method
- **Conventional commits** + `Assisted-by:` trailer

---

## JAX-RS Endpoint Pattern

```java
@Path("/workspace")
public class WorkspaceService {

    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public WorkspaceDto getWorkspace(@PathParam("id") String workspaceId)
        throws NotFoundException, ServerException {
        // implementation
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response createWorkspace(WorkspaceConfigDto config, @Context UriInfo uriInfo)
        throws ConflictException, ServerException, BadRequestException {
        // implementation
    }
}
```

---

## Testing Pattern

```java
@Test
public void shouldExposeClientIdInDescriptor() throws Exception {
    // given
    OAuthAuthenticator authenticator = mock(OAuthAuthenticator.class);
    when(authenticator.getClientId()).thenReturn("my-client-id");
    when(authenticator.getEndpointUrl()).thenReturn("https://github.com");

    // when
    OAuthAuthenticatorDescriptor descriptor = service.getAuthenticatorDescriptor(authenticator);

    // then
    assertEquals("my-client-id", descriptor.getClientId());
}
```
