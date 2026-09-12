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

/**
 * Database client — two backends, same interface:
 *
 *   DATABASE_URL set  →  real postgres via pg.Pool (cluster / production)
 *   DATABASE_URL unset →  PGlite (Postgres-in-WASM, embedded, no server needed)
 *
 * PGlite is ~3.5 MB and supports the full PostgreSQL SQL dialect including
 * SERIAL, TEXT[], TIMESTAMPTZ, JSONB — zero migration changes required.
 *
 * Storage location for PGlite:
 *   PGLITE_DATA_DIR set  →  persistent file store at that path
 *   PGLITE_DATA_DIR unset →  in-memory (reset on restart, suitable for dev/test)
 */

import type { Pool as PgPool } from 'pg';
import type { PGlite } from '@electric-sql/pglite';

// Shared query interface — both pg.Pool and PGlite implement this subset
export interface DbClient {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; rowCount?: number | null }>;
  end?(): Promise<void>;
}

let _db: DbClient | null = null;

async function createClient(): Promise<DbClient> {
  const url = process.env.DATABASE_URL;

  if (url) {
    // ── Real Postgres via pg.Pool ─────────────────────────────────────────
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url }) as unknown as PgPool;
    console.log('[db] Using postgres (pg.Pool) at', url.replace(/:[^@]+@/, ':***@'));
    return pool as unknown as DbClient;
  }

  // ── PGlite: Postgres in WASM ──────────────────────────────────────────────
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = process.env.PGLITE_DATA_DIR;

  if (dataDir) {
    // Auto-recover from corrupted data directory (e.g. after force-kill mid-write)
    const tryOpen = async (dir: string): Promise<PGlite> => {
      const pglite = new PGlite(dir) as unknown as PGlite;
      await pglite.waitReady;
      await (pglite as unknown as { query: (s: string) => Promise<unknown> }).query('SELECT 1');
      return pglite;
    };
    try {
      const pglite = await tryOpen(dataDir);
      console.log(`[db] Using PGlite (persistent) at ${dataDir}`);
      return pglite as unknown as DbClient;
    } catch {
      console.warn(`[db] PGlite data corrupted at ${dataDir} — wiping and restarting fresh`);
      const { rmSync, mkdirSync } = await import('node:fs');
      rmSync(dataDir, { recursive: true, force: true });
      mkdirSync(dataDir, { recursive: true });
      const pglite = await tryOpen(dataDir);
      console.log(`[db] Using PGlite (fresh) at ${dataDir}`);
      return pglite as unknown as DbClient;
    }
  }

  const pglite = new PGlite() as unknown as PGlite;
  await pglite.waitReady;
  console.log('[db] Using PGlite (in-memory) — data resets on restart');
  console.log('[db]   Set PGLITE_DATA_DIR=/app/data for persistence');
  return pglite as unknown as DbClient;
}

// Lazy singleton — initialised on first access
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    return async (...args: unknown[]) => {
      if (!_db) _db = await createClient();
      const fn = (_db as unknown as Record<string, (...a: unknown[]) => unknown>)[prop as string];
      if (typeof fn !== 'function') return undefined;
      return fn.apply(_db, args);
    };
  },
});
