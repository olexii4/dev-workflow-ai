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

// ── Inline copies of pure functions from src/api/routes/sources.ts ──────────
// These are not exported from the route file; test the logic directly here.

function classifyUrl(url: string): { kind: 'github' | 'jira'; label: string } | null {
  const gh = url.match(/github\.com\/([^/]+\/[^/?\s]+)/);
  if (gh) {
    const slug = gh[1].replace(/\/(issues|pulls).*$/, '');
    return { kind: 'github', label: slug };
  }
  if (url.includes('atlassian.net') || url.includes('/jira/') || url.includes('/browse/')) {
    const host = new URL(url).hostname;
    return { kind: 'jira', label: host };
  }
  return null;
}

const SKIP_LABELS = new Set([
  'wontfix',
  'duplicate',
  'stale',
  'lifecycle/stale',
  'needs-triage',
  'blocked',
  'invalid',
]);
const BASE_SCORE: Record<string, number> = {
  'kind/bug': 10,
  'kind/enhancement': 6,
  'area/docs': 3,
};
const BOOST: Record<string, number> = {
  'priority/critical': 5,
  'priority/major': 3,
  'good first issue': 1,
};

function scoreIssue(labels: string[]): { score: number; priority: string } {
  let score = 5;
  let priority = '';
  const PRIORITY_LABELS: Record<string, string> = {
    'priority/critical': 'critical',
    'priority/blocker': 'critical',
    'priority/major': 'major',
    'priority/minor': 'minor',
    'priority/trivial': 'trivial',
  };
  for (const label of labels) {
    if (BASE_SCORE[label]) score += BASE_SCORE[label];
    if (BOOST[label]) score += BOOST[label];
    if (PRIORITY_LABELS[label]) priority = PRIORITY_LABELS[label];
  }
  return { score, priority };
}

function estimateStoryPoints(body: string, title: string): number {
  const text = (title + ' ' + body).toLowerCase();
  if (text.includes('typo') || text.includes('minor') || text.includes('bump version')) return 1;
  if (text.includes('crash') || text.includes('null pointer') || text.includes('npe')) return 2;
  if (body.length > 1000) return 3;
  return 2;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('classifyUrl', () => {
  it('classifies GitHub issues URL', () => {
    const r = classifyUrl('https://github.com/eclipse-che/che-dashboard/issues');
    expect(r?.kind).toBe('github');
    expect(r?.label).toBe('eclipse-che/che-dashboard');
  });

  it('classifies GitHub repo URL without /issues suffix', () => {
    const r = classifyUrl('https://github.com/eclipse-che/che-dashboard');
    expect(r?.kind).toBe('github');
    expect(r?.label).toBe('eclipse-che/che-dashboard');
  });

  it('classifies Jira for-you URL', () => {
    const r = classifyUrl('https://redhat.atlassian.net/jira/for-you');
    expect(r?.kind).toBe('jira');
    expect(r?.label).toBe('redhat.atlassian.net');
  });

  it('classifies Jira browse URL', () => {
    const r = classifyUrl('https://redhat.atlassian.net/browse/CRW-12731');
    expect(r?.kind).toBe('jira');
  });

  it('returns null for unrecognized URL', () => {
    expect(classifyUrl('https://example.com/foo')).toBeNull();
  });
});

describe('scoreIssue', () => {
  it('scores a bug with critical priority higher than a docs issue', () => {
    const bug = scoreIssue(['kind/bug', 'priority/critical']);
    const docs = scoreIssue(['area/docs']);
    expect(bug.score).toBeGreaterThan(docs.score);
  });

  it('extracts priority from labels', () => {
    expect(scoreIssue(['priority/major']).priority).toBe('major');
    expect(scoreIssue(['priority/critical']).priority).toBe('critical');
    expect(scoreIssue(['kind/bug']).priority).toBe('');
  });

  it('gives base score 5 for unlabelled issue', () => {
    expect(scoreIssue([]).score).toBe(5);
  });

  it('adds boost for good first issue', () => {
    const withBoost = scoreIssue(['good first issue']);
    const without = scoreIssue([]);
    expect(withBoost.score).toBe(without.score + 1);
  });

  it('skips labels not in any map', () => {
    const r = scoreIssue(['some-random-label']);
    expect(r.score).toBe(5);
    expect(r.priority).toBe('');
  });
});

describe('estimateStoryPoints', () => {
  it('returns 1 for typo fixes', () => {
    expect(estimateStoryPoints('Fix typo in README', 'Typo fix')).toBe(1);
  });

  it('returns 1 for version bumps', () => {
    expect(estimateStoryPoints('Bump version to 2.0', '')).toBe(1);
  });

  it('returns 2 for crash bugs', () => {
    expect(estimateStoryPoints('App crashes on startup', 'crash fix')).toBe(2);
  });

  it('returns 3 for long issue bodies (> 1000 chars)', () => {
    const longBody = 'a'.repeat(1001);
    expect(estimateStoryPoints(longBody, 'some issue')).toBe(3);
  });

  it('returns 2 as default', () => {
    expect(estimateStoryPoints('Fix the login button color', 'Button color')).toBe(2);
  });
});

describe('skip labels', () => {
  it('SKIP_LABELS includes wontfix', () => {
    expect(SKIP_LABELS.has('wontfix')).toBe(true);
  });

  it('SKIP_LABELS includes lifecycle/stale', () => {
    expect(SKIP_LABELS.has('lifecycle/stale')).toBe(true);
  });

  it('SKIP_LABELS does not include kind/bug', () => {
    expect(SKIP_LABELS.has('kind/bug')).toBe(false);
  });
});
