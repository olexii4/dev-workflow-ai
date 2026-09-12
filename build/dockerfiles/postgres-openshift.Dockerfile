# Copyright (c) 2026 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# postgres-openshift — postgres:16-alpine with OpenShift non-root UID compatibility.
#
# Problem:
#   OpenShift SCCs run containers as a random non-root UID (e.g. 1000660000).
#   The official postgres:16-alpine sets PGDATA=/var/lib/postgresql/data which is
#   owned by UID 70 (postgres user) with mode 0700. The assigned UID cannot access
#   or chown it, so initdb fails with "Operation not permitted".
#
# Fix:
#   Override PGDATA to /tmp/pgdata. The container creates this directory itself,
#   so it is owned by the assigned UID from the start. The entrypoint already
#   handles chmod failures with "|| :" so no entrypoint patching is needed.
#   /var/run/postgresql is already mode 3775 (group+other writable) in the base
#   image, so postgres socket creation works without ownership.
#
# Usage:
#   docker build -f build/dockerfiles/postgres-openshift.Dockerfile -t <image> .
#   podman build -f build/dockerfiles/postgres-openshift.Dockerfile -t <image> .
#
# In devfile.yaml:
#   image: <registry>/<org>/dev-workflow-ai-postgres:16

FROM docker.io/postgres:16-alpine

# Redirect PGDATA to a location the container process can create and own.
# /tmp is world-writable; the process creates /tmp/pgdata with its own UID.
ENV PGDATA=/tmp/pgdata

# Ensure /var/run/postgresql is group+other writable so any UID can use
# the postgres socket. The base image sets this to 3775 (drwxrwsr-x);
# this RUN step makes it explicit and survives layer caching.
RUN chmod 3775 /var/run/postgresql

# postgres:16-alpine runs as UID 70 by default; when OpenShift assigns
# a different UID at runtime, postgres uses libnss_wrapper (already in
# the image) to create a fake /etc/passwd entry for that UID.
# No further changes are needed — the entrypoint handles the rest.
