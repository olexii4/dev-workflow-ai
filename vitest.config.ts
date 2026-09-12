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

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/agent-backend/src/**/*.{test,spec}.ts',
      'packages/agent-frontend/src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'packages/*/lib'],
    passWithNoTests: true,
    environmentMatchGlobs: [
      ['packages/agent-backend/src/**/*.spec.ts', 'node'],
      ['packages/agent-frontend/src/**/*.spec.{ts,tsx}', 'jsdom'],
    ],
    globals: true,
    setupFiles: ['packages/agent-frontend/src/__tests__/setup.ts'],
  },
});
