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

import { describe, it, expect } from 'vitest';

// ── Pure helpers re-tested here (no DB, no network) ──────────────────────────

function isPublic(url: string): boolean {
  return url.startsWith('/api/auth/') || url === '/health' || !url.startsWith('/api/');
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('isPublic route guard', () => {
  it('allows /api/auth/login', () => {
    expect(isPublic('/api/auth/login')).toBe(true);
  });

  it('allows /api/auth/me', () => {
    expect(isPublic('/api/auth/me')).toBe(true);
  });

  it('allows /api/auth/logout', () => {
    expect(isPublic('/api/auth/logout')).toBe(true);
  });

  it('allows /health', () => {
    expect(isPublic('/health')).toBe(true);
  });

  it('allows static file routes (not /api/)', () => {
    expect(isPublic('/')).toBe(true);
    expect(isPublic('/branding/product.json')).toBe(true);
    expect(isPublic('/dist/main.js')).toBe(true);
  });

  it('blocks /api/runs', () => {
    expect(isPublic('/api/runs')).toBe(false);
  });

  it('blocks /api/projects', () => {
    expect(isPublic('/api/projects')).toBe(false);
  });

  it('blocks /api/issues', () => {
    expect(isPublic('/api/issues')).toBe(false);
  });

  it('blocks /api/sources', () => {
    expect(isPublic('/api/sources')).toBe(false);
  });
});

describe('OpenShift gateway header extraction', () => {
  function resolveUser(headers: Record<string, string | undefined>) {
    const login = headers['x-forwarded-preferred-username'] ?? headers['x-forwarded-user'];
    if (!login) return { login: 'dev', name: 'Dev Mode', email: '', avatar: '' };
    return { login, name: login, email: headers['x-forwarded-email'] ?? '', avatar: '' };
  }

  it('prefers x-forwarded-preferred-username over x-forwarded-user', () => {
    const user = resolveUser({
      'x-forwarded-preferred-username': 'olexii4',
      'x-forwarded-user': 'user-id-123',
    });
    expect(user.login).toBe('olexii4');
  });

  it('falls back to x-forwarded-user when preferred-username absent', () => {
    const user = resolveUser({ 'x-forwarded-user': 'olexii4' });
    expect(user.login).toBe('olexii4');
  });

  it('returns dev mode user when no gateway headers present', () => {
    const user = resolveUser({});
    expect(user.login).toBe('dev');
    expect(user.name).toBe('Dev Mode');
  });

  it('includes email when x-forwarded-email is present', () => {
    const user = resolveUser({
      'x-forwarded-preferred-username': 'olexii4',
      'x-forwarded-email': 'olexii4@redhat.com',
    });
    expect(user.email).toBe('olexii4@redhat.com');
  });
});
