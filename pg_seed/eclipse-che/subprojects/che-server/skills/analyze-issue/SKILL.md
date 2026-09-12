---
name: analyze-issue
description: Analyze a che-server GitHub issue. Identifies affected Java modules, API surface, and fix scope.
argument-hint: "[issue-number]"
---

# Analyze che-server Issue

## Workflow

### 1. Fetch the issue

```bash
ISSUE_NUM=<parse from $ARGUMENTS>
gh issue view ${ISSUE_NUM} --repo eclipse-che/che-server \
  --json number,title,body,labels,assignees,state
```

Stop if: closed, already assigned, or has forbidden labels (`wontfix`, `duplicate`, `stale`).

### 2. Parse the issue body

Extract:
- Steps to reproduce
- Expected vs actual behavior
- API endpoint mentioned (if any)
- Error messages or stack traces

### 3. Identify the affected module

| Symptom | Module |
|---|---|
| OAuth, token refresh, login | `multiuser/` or `wsmaster/che-core-api-auth/` |
| Workspace create/start/stop | `wsmaster/che-core-api-workspace/` |
| Factory URL / Devfile parsing | `wsmaster/che-core-api-factory/` |
| Kubernetes resource creation | `infrastructures/kubernetes/` |
| OpenShift-specific | `infrastructures/openshift/` |
| REST API response shape | `wsmaster/che-core-api-workspace/src/main/java/...` DTO classes |

```bash
# Search for the class or endpoint mentioned
cd "$LOCAL_PATH"
grep -r "methodOrClassName" --include="*.java" -l
grep -r "/api/endpoint" --include="*.java" -l
```

### 4. Identify the layer

- **REST endpoint** (`@GET`/`@POST`/`@PUT`/`@DELETE` annotations) → controller/resource class
- **Service** (`@ApplicationScoped`/`@Singleton`) → service class
- **Repository/DAO** → interacts with k8s API or DB
- **DTO** → data transfer object used in REST response

### 5. Find affected files

List all Java files that will likely need changes, plus their test classes (`*Test.java`).

### 6. Estimate story points

- 1: single field/method fix, typo, config value
- 2: one class + minor test update
- 3: service method change + test cases
- 5: cross-module change (e.g., REST + service + DTO)
- 8: infra-level or multi-module architecture change

## Output

```
## Issue Analysis: #NNNN — <title>

**Module:** wsmaster/che-core-api-workspace
**Layer:** Service → REST
**Type:** bug / enhancement

**Affected files:**
- wsmaster/.../WorkspaceManager.java
- wsmaster/.../WorkspaceManagerTest.java

**Root cause hypothesis:** <what is broken>
**Fix scope:** <what to change>
**Story points:** 2
**Ready to implement:** yes
```
