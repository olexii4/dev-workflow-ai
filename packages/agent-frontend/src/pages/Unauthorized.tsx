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

import React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, Button, PageSection } from '@patternfly/react-core';

export default function Unauthorized() {
  const params = new URLSearchParams(window.location.search);
  const login = params.get('login') ?? '';
  const reason = params.get('reason') ?? '';

  return (
    <PageSection style={{ minHeight: '100vh' }}>
      <Bullseye>
        <EmptyState titleText="Access Denied" headingLevel="h1">
          <EmptyStateBody>
            {login
              ? `GitHub account "${login}" is not in the allowed list.`
              : reason === 'invalid_state'
                ? 'OAuth state mismatch — please try again.'
                : 'Your GitHub account is not authorized to access this application.'}
          </EmptyStateBody>
          <Button
            variant="link"
            onClick={() => {
              window.location.href = '/api/auth/login';
            }}
          >
            Try a different account
          </Button>
        </EmptyState>
      </Bullseye>
    </PageSection>
  );
}
