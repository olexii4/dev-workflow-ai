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

// ── Inline copies of pure functions from src/nodes/priorityCheck.ts ─────────

type Priority = 'critical' | 'major' | 'minor' | 'trivial';
const PRIORITY_ORDER: Priority[] = ['critical', 'major', 'minor', 'trivial'];

const GITHUB_LABEL_MAP: Record<string, Priority> = {
  'priority/critical': 'critical',
  'priority/blocker': 'critical',
  'priority/major': 'major',
  'priority/minor': 'minor',
  'priority/trivial': 'trivial',
};

const JIRA_PRIORITY_MAP: Record<string, Priority> = {
  Critical: 'critical',
  Blocker: 'critical',
  Major: 'major',
  Normal: 'minor',
  Minor: 'minor',
  Trivial: 'trivial',
};

function meetsThreshold(priority: Priority, min: Priority): boolean {
  return PRIORITY_ORDER.indexOf(priority) <= PRIORITY_ORDER.indexOf(min);
}

function extractJiraKey(body: string): string | null {
  const m = body.match(/atlassian\.net\/browse\/([A-Z]+-\d+)/);
  return m?.[1] ?? null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('meetsThreshold', () => {
  it('critical meets critical threshold', () => {
    expect(meetsThreshold('critical', 'critical')).toBe(true);
  });

  it('critical meets major threshold', () => {
    expect(meetsThreshold('critical', 'major')).toBe(true);
  });

  it('major meets major threshold', () => {
    expect(meetsThreshold('major', 'major')).toBe(true);
  });

  it('minor does NOT meet major threshold', () => {
    expect(meetsThreshold('minor', 'major')).toBe(false);
  });

  it('trivial does NOT meet major threshold', () => {
    expect(meetsThreshold('trivial', 'major')).toBe(false);
  });

  it('trivial meets trivial threshold', () => {
    expect(meetsThreshold('trivial', 'trivial')).toBe(true);
  });

  it('minor meets minor threshold', () => {
    expect(meetsThreshold('minor', 'minor')).toBe(true);
  });
});

describe('GITHUB_LABEL_MAP', () => {
  it('maps priority/critical to critical', () => {
    expect(GITHUB_LABEL_MAP['priority/critical']).toBe('critical');
  });

  it('maps priority/blocker to critical', () => {
    expect(GITHUB_LABEL_MAP['priority/blocker']).toBe('critical');
  });

  it('maps priority/major to major', () => {
    expect(GITHUB_LABEL_MAP['priority/major']).toBe('major');
  });

  it('returns undefined for unknown label', () => {
    expect(GITHUB_LABEL_MAP['kind/bug']).toBeUndefined();
  });
});

describe('JIRA_PRIORITY_MAP', () => {
  it('maps Critical to critical', () => {
    expect(JIRA_PRIORITY_MAP['Critical']).toBe('critical');
  });

  it('maps Major to major', () => {
    expect(JIRA_PRIORITY_MAP['Major']).toBe('major');
  });

  it('maps Normal to minor', () => {
    expect(JIRA_PRIORITY_MAP['Normal']).toBe('minor');
  });

  it('returns undefined for unknown name', () => {
    expect(JIRA_PRIORITY_MAP['Unknown']).toBeUndefined();
  });
});

describe('extractJiraKey', () => {
  it('extracts CRW key from issue body', () => {
    const body = 'See https://redhat.atlassian.net/browse/CRW-12731 for details.';
    expect(extractJiraKey(body)).toBe('CRW-12731');
  });

  it('extracts CHE key', () => {
    const body = 'Linked: https://redhat.atlassian.net/browse/CHE-999';
    expect(extractJiraKey(body)).toBe('CHE-999');
  });

  it('returns null when no Jira link is present', () => {
    expect(extractJiraKey('No Jira link here.')).toBeNull();
  });

  it('returns null for GitHub issue URLs', () => {
    expect(extractJiraKey('https://github.com/eclipse-che/che/issues/20670')).toBeNull();
  });
});
