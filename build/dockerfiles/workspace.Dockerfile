# Copyright (c) 2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# workspace — single-container image: UDI + PostgreSQL 16 + dev-workflow-ai tools.
#
# Rationale:
#   The devfile sidecar approach (UDI + separate postgres container) requires
#   careful SCC/UID coordination on OpenShift. Bundling postgres into the
#   workspace image eliminates the sidecar entirely:
#     - Postgres runs inside the tools container as a background service
#     - No UID conflict: postgres is managed by the same process tree
#     - Devfile needs only one container component
#     - DATABASE_URL=postgres://agent:agent@localhost:5432/devworkflow works
#       as before (loopback inside the same container)
#
# Usage:
#   ./build/build.sh --workspace-image
#   or:
#   podman build -f build/dockerfiles/workspace.Dockerfile \
#     -t quay.io/<org>/dev-workflow-ai-workspace:latest .
#
# In devfile.yaml replace the two components (tools + postgres) with:
#   components:
#     - name: workspace
#       container:
#         image: quay.io/<org>/dev-workflow-ai-workspace:latest
#         memoryLimit: 6G
#         env:
#           - name: DATABASE_URL
#             value: "postgres://agent:agent@localhost:5432/devworkflow"

# registry.access.redhat.com/ubi9/nodejs-20:
#   - Public registry (no auth required), UBI9 base, Node.js 20 LTS
#   - Runs as non-root UID 1001 — OpenShift SCC compatible
#   - Much smaller than universal-developer-image (no IDE, no dev tools)
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

# ── Install PostgreSQL 16 ─────────────────────────────────────────────────────

USER root

# UBI9-based. PostgreSQL 16 is available from the official PGDG repo.
RUN curl -fsSL https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-$(uname -m)/pgdg-redhat-repo-latest.noarch.rpm \
      -o /tmp/pgdg.rpm \
    && rpm -i /tmp/pgdg.rpm \
    && rm -f /tmp/pgdg.rpm \
    && dnf install -y --disablerepo=* \
         --enablerepo=pgdg16 \
         postgresql16 postgresql16-server \
    && dnf clean all \
    && rm -rf /var/cache/dnf

# Symlink binaries so PATH resolution works without full path
RUN ln -sf /usr/pgsql-16/bin/postgres      /usr/local/bin/postgres    \
    && ln -sf /usr/pgsql-16/bin/pg_ctl     /usr/local/bin/pg_ctl      \
    && ln -sf /usr/pgsql-16/bin/initdb     /usr/local/bin/initdb      \
    && ln -sf /usr/pgsql-16/bin/psql       /usr/local/bin/psql

# ── PostgreSQL startup script ─────────────────────────────────────────────────

COPY build/dockerfiles/scripts/start-postgres.sh /usr/local/bin/start-postgres.sh
RUN chmod +x /usr/local/bin/start-postgres.sh

# ── Entrypoint wrapper ────────────────────────────────────────────────────────

COPY build/dockerfiles/scripts/workspace-entrypoint.sh /usr/local/bin/workspace-entrypoint.sh
RUN chmod +x /usr/local/bin/workspace-entrypoint.sh

# Make /var/run/postgresql world-writable so any OpenShift-assigned UID can
# create the postgres socket there.
RUN mkdir -p /var/run/postgresql \
    && chmod 3777 /var/run/postgresql

# ── Runtime defaults ──────────────────────────────────────────────────────────

# /tmp/pgdata is owned by the running UID from first init — always works
# regardless of the UID assigned by the OpenShift SCC.
ENV PGDATA=/tmp/pgdata \
    POSTGRES_DB=devworkflow \
    POSTGRES_USER=agent \
    POSTGRES_PASSWORD=agent \
    PGHOST=/var/run/postgresql

# Switch back to the UDI default non-root user
USER 10001

ENTRYPOINT ["/usr/local/bin/workspace-entrypoint.sh"]
CMD ["tail", "-f", "/dev/null"]
