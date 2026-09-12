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

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const bashTool = tool(
  async ({ command, cwd }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd ?? process.cwd(),
        timeout: 120_000,
        env: { ...process.env },
      });
      return (stdout + stderr).slice(0, 8000);
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return `ERROR: ${err.message ?? String(e)}\n${err.stdout ?? ''}\n${err.stderr ?? ''}`.slice(
        0,
        4000,
      );
    }
  },
  {
    name: 'bash',
    description: 'Run a shell command. Returns stdout+stderr (capped at 8000 chars).',
    schema: z.object({
      command: z.string().describe('Shell command to execute'),
      cwd: z.string().optional().describe('Working directory'),
    }),
  },
);
