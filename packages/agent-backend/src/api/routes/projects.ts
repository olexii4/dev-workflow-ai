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

import { exec } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/client.js';
import { loadContext } from '../../context/loader.js';
import type { ProjectRow, ContextRow } from '../../db/schema.js';

const execAsync = promisify(exec);

const DEFAULT_CLONE_DIR = process.env.WORKSPACE_DIR ?? '.repos';

async function getCloneDir(): Promise<string> {
  try {
    const { rows } = await db.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'cloneDir'",
    );
    return rows[0]?.value || DEFAULT_CLONE_DIR;
  } catch {
    return DEFAULT_CLONE_DIR;
  }
}

async function gitCloneOrPull(repo: string, localPath: string): Promise<string> {
  const repoUrl = `https://github.com/${repo}.git`;
  try {
    // Check if already cloned
    await execAsync(`git -C ${JSON.stringify(localPath)} rev-parse --git-dir`, { timeout: 5_000 });
    // Already cloned — fetch all and pull default branch
    await execAsync(`git -C ${JSON.stringify(localPath)} fetch --all --prune`, { timeout: 60_000 });
    const { stdout: branch } = await execAsync(
      `git -C ${JSON.stringify(localPath)} symbolic-ref refs/remotes/origin/HEAD`,
      { timeout: 5_000 },
    );
    const defaultBranch = branch.trim().replace('refs/remotes/origin/', '');
    await execAsync(
      `git -C ${JSON.stringify(localPath)} checkout ${defaultBranch} && git -C ${JSON.stringify(localPath)} pull -p`,
      { timeout: 60_000 },
    );
    return localPath;
  } catch {
    // Not cloned yet — clone fresh
    const cloneBase = await getCloneDir();
    const { mkdirSync } = await import('node:fs');
    mkdirSync(cloneBase, { recursive: true });
    await execAsync(`git clone ${JSON.stringify(repoUrl)} ${JSON.stringify(localPath)}`, {
      timeout: 300_000,
    });
    return localPath;
  }
}

const tags = ['Projects'];

export const projectsRoutes: FastifyPluginAsync = async app => {
  // GET / — list all projects
  app.get('/', { schema: { tags } }, async (_req, reply) => {
    const { rows } = await db.query<ProjectRow>('SELECT * FROM projects ORDER BY slug');
    return reply.send(rows);
  });

  // GET /:slug — single project with context file list
  app.get<{ Params: { slug: string } }>('/:slug', { schema: { tags } }, async (req, reply) => {
    const { slug } = req.params;
    const { rows: projectRows } = await db.query<ProjectRow>(
      'SELECT * FROM projects WHERE slug = $1',
      [slug],
    );
    if (!projectRows[0]) return reply.status(404).send({ error: 'Project not found' });

    const { rows: contextRows } = await db.query<
      Pick<ContextRow, 'name' | 'source_file' | 'updated_at'>
    >('SELECT name, source_file, updated_at FROM contexts WHERE project_slug = $1 ORDER BY name', [
      slug,
    ]);

    return reply.send({ ...projectRows[0], contexts: contextRows });
  });

  // GET /:slug/context — merged context text
  app.get<{ Params: { slug: string }; Querystring: { filter?: string } }>('/:slug/context', { schema: { tags } }, async (req, reply) => {
      const { slug } = req.params;
      const filter = req.query.filter ? req.query.filter.split(',') : undefined;
      const context = await loadContext(slug, filter);
      return reply.type('text/plain').send(context);
    },
  );

  // POST / — create project
  app.post<{
    Body: {
      slug: string;
      repo: string;
      local_path?: string;
      stack?: string[];
      description?: string;
      auto_approve_min_priority?: string;
      story_point_budget?: number;
    };
  }>('/', { schema: { tags } }, async (req, reply) => {
    const {
      slug,
      repo,
      local_path,
      stack,
      description,
      auto_approve_min_priority,
      story_point_budget,
    } = req.body;
    const { rows } = await db.query<ProjectRow>(
      `INSERT INTO projects (slug, repo, local_path, stack, description, auto_approve_min_priority, story_point_budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE
         SET repo = EXCLUDED.repo,
             local_path = EXCLUDED.local_path,
             stack = EXCLUDED.stack,
             description = EXCLUDED.description,
             auto_approve_min_priority = EXCLUDED.auto_approve_min_priority,
             story_point_budget = EXCLUDED.story_point_budget,
             updated_at = now()
       RETURNING *`,
      [
        slug,
        repo,
        local_path ?? '',
        stack ?? [],
        description ?? '',
        auto_approve_min_priority ?? 'major',
        story_point_budget ?? 3,
      ],
    );
    return reply.status(201).send(rows[0]);
  });

  // PUT /:slug — update project
  app.put<{
    Params: { slug: string };
    Body: Partial<ProjectRow>;
  }>('/:slug', { schema: { tags } }, async (req, reply) => {
    const { slug } = req.params;
    const { repo, local_path, stack, description, auto_approve_min_priority, story_point_budget } =
      req.body;

    const { rows } = await db.query<ProjectRow>(
      `UPDATE projects SET
        repo = COALESCE($2, repo),
        local_path = COALESCE($3, local_path),
        stack = COALESCE($4, stack),
        description = COALESCE($5, description),
        auto_approve_min_priority = COALESCE($6, auto_approve_min_priority),
        story_point_budget = COALESCE($7, story_point_budget),
        updated_at = now()
       WHERE slug = $1 RETURNING *`,
      [slug, repo, local_path, stack, description, auto_approve_min_priority, story_point_budget],
    );

    if (!rows[0]) return reply.status(404).send({ error: 'Project not found' });
    return reply.send(rows[0]);
  });

  // DELETE /:slug — delete project and its cloned repo
  app.delete<{ Params: { slug: string } }>('/:slug', { schema: { tags } }, async (req, reply) => {
    const { slug } = req.params;
    const { rows } = await db.query<ProjectRow>('SELECT * FROM projects WHERE slug = $1', [slug]);
    if (!rows[0]) return reply.status(404).send({ error: 'Project not found' });

    const localPath = rows[0].local_path;
    await db.query('DELETE FROM contexts WHERE project_slug = $1', [slug]);
    await db.query('DELETE FROM projects WHERE slug = $1', [slug]);

    if (localPath) {
      await rm(localPath, { recursive: true, force: true }).catch(e =>
        console.warn(`[projects] rm ${localPath} failed: ${e instanceof Error ? e.message : e}`),
      );
    }

    return reply.status(204).send();
  });

  // POST /:slug/update — clone or pull the repo, update local_path in DB
  app.post<{ Params: { slug: string } }>('/:slug/update', { schema: { tags } }, async (req, reply) => {
    const { slug } = req.params;
    const { rows } = await db.query<ProjectRow>('SELECT * FROM projects WHERE slug = $1', [slug]);
    if (!rows[0]) return reply.status(404).send({ error: 'Project not found' });

    const project = rows[0];
    if (!project.repo) return reply.status(400).send({ error: 'Project has no repo configured' });

    const cloneBase = await getCloneDir();
    const targetPath = join(cloneBase, project.repo);

    try {
      const actualPath = await gitCloneOrPull(project.repo, targetPath);
      const { rows: updated } = await db.query<ProjectRow>(
        'UPDATE projects SET local_path = $2, updated_at = now() WHERE slug = $1 RETURNING *',
        [slug, actualPath],
      );
      return reply.send({ project: updated[0], cloned: !project.local_path });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(500).send({ error: `git operation failed: ${msg}` });
    }
  });
};
