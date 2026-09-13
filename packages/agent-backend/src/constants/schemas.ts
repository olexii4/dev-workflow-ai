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

import { providerTestExample, startRunExample } from './examples.js';

export const providerTestSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', minLength: 1 },
    provider_id: { type: 'string' },
  },
  required: ['prompt'],
  examples: [providerTestExample],
} as const;

export const startRunSchema = {
  type: 'object',
  properties: {
    project: { type: 'string' },
    issueNumber: { type: 'number' },
    issueUrl: { type: 'string' },
    forcePriority: { type: 'boolean' },
    outputDir: { type: 'string' },
  },
  examples: [startRunExample],
} as const;
