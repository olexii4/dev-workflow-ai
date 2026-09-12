/*
 * Copyright (c) 2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React, { useEffect } from 'react';
import { Bullseye, EmptyState, EmptyStateBody, PageSection, Spinner } from '@patternfly/react-core';
import { useBranding } from '../contexts/BrandingContext.js';

// When deployed in Eclipse Che, the oauth-proxy gateway intercepts unauthenticated
// requests before they reach the app and redirects the user to OpenShift OAuth
// automatically. This page should never be visible in production — it only appears
// in dev mode (no gateway) where /api/preferences/user returns a synthetic dev user.
export default function Login() {
  const branding = useBranding();

  // Trigger /api/preferences/user again — in dev mode it resolves immediately and the
  // AuthContext will populate, removing this page from view.
  useEffect(() => {
    window.location.href = '/api/auth/login';
  }, []);

  return (
    <PageSection style={{ minHeight: '100vh' }}>
      <Bullseye>
        <EmptyState
          titleText={`Connecting to ${branding.name}`}
          headingLevel="h1"
          icon={() => <Spinner size="xl" aria-label="Connecting" />}
        >
          <EmptyStateBody>Redirecting to OpenShift login…</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    </PageSection>
  );
}
