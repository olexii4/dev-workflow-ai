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

async function gh(args: string): Promise<string> {
  const env = { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN ?? '' };
  try {
    const { stdout, stderr } = await execAsync(`gh ${args}`, { env, timeout: 30_000 });
    return stdout || stderr;
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return `ERROR: ${err.message ?? String(e)}\n${err.stderr ?? ''}`;
  }
}

export const ghIssueTool = tool(
  async ({ repo, issueNumber }) =>
    gh(
      `issue view ${issueNumber} --repo ${repo} --json number,title,body,labels,assignees,comments`,
    ),
  {
    name: 'gh_issue_view',
    description: 'Fetch a GitHub issue as JSON including labels, body, assignees.',
    schema: z.object({
      repo: z.string().describe('GitHub repo in owner/repo format'),
      issueNumber: z.number().describe('Issue number'),
    }),
  },
);

export const ghIssueListTool = tool(
  async ({ repo, labels, limit }) =>
    gh(
      `issue list --repo ${repo} --state open ${labels ? `--label "${labels}"` : ''} --json number,title,labels,body,assignees --limit ${limit ?? 50}`,
    ),
  {
    name: 'gh_issue_list',
    description: 'List open GitHub issues with labels and body.',
    schema: z.object({
      repo: z.string(),
      labels: z.string().optional().describe('Comma-separated label filters'),
      limit: z.number().optional(),
    }),
  },
);

export const ghIssueEditTool = tool(
  async ({ repo, issueNumber, addAssignee }) =>
    gh(
      `issue edit ${issueNumber} --repo ${repo}${addAssignee ? ` --add-assignee ${addAssignee}` : ''}`,
    ),
  {
    name: 'gh_issue_edit',
    description: 'Edit a GitHub issue (e.g. add assignee).',
    schema: z.object({
      repo: z.string(),
      issueNumber: z.number(),
      addAssignee: z.string().optional(),
    }),
  },
);

export const ghPrCreateTool = tool(
  async ({ repo, title, body, draft, base }) => {
    const safeTitle = title.replace(/"/g, '\\"');
    const safeBody = body.replace(/"/g, '\\"');
    return gh(
      `pr create --repo ${repo} --title "${safeTitle}" --body "${safeBody}" ${draft ? '--draft' : ''} --base ${base ?? 'main'}`,
    );
  },
  {
    name: 'gh_pr_create',
    description: 'Create a GitHub pull request. Returns the PR URL.',
    schema: z.object({
      repo: z.string(),
      title: z.string(),
      body: z.string(),
      draft: z.boolean().optional(),
      base: z.string().optional(),
    }),
  },
);

export const ghPrDiffTool = tool(
  async ({ repo, prNumber }) => gh(`pr diff ${prNumber} --repo ${repo}`),
  {
    name: 'gh_pr_diff',
    description: 'Get the unified diff of a GitHub PR.',
    schema: z.object({
      repo: z.string(),
      prNumber: z.number(),
    }),
  },
);

export const ghPrCommentTool = tool(
  async ({ repo, prNumber, body }) => {
    const safeBody = body.replace(/"/g, '\\"');
    return gh(`pr comment ${prNumber} --repo ${repo} --body "${safeBody}"`);
  },
  {
    name: 'gh_pr_comment',
    description: 'Post a comment on a GitHub PR.',
    schema: z.object({
      repo: z.string(),
      prNumber: z.number(),
      body: z.string(),
    }),
  },
);
