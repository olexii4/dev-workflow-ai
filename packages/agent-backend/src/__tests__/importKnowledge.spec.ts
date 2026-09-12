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

// ── Inline copy of classifyFile from src/init/importKnowledge.ts ─────────────

interface Classified {
  projectSlug: string;
  name: string;
  isProjectContext: boolean;
}

function classifyFile(rel: string): Classified | null {
  const contextMatch = rel.match(/^context\/([^/]+)\.md$/);
  if (contextMatch) {
    return { projectSlug: 'global', name: contextMatch[1], isProjectContext: false };
  }

  const mainContextMatch = rel.match(/^subprojects\/([^/]+)\/context\.md$/);
  if (mainContextMatch) {
    return { projectSlug: mainContextMatch[1], name: 'context', isProjectContext: true };
  }

  const projectMatch = rel.match(/^subprojects\/([^/]+)\/(.+?)(?:\/SKILL)?\.md$/);
  if (projectMatch) {
    const slug = projectMatch[1];
    const rawName = projectMatch[2].replace(/\//g, '-');
    return { projectSlug: slug, name: rawName, isProjectContext: false };
  }

  const sharedRules = rel.match(/^shared\/rules\/([^/]+)\.md$/);
  if (sharedRules) {
    return { projectSlug: 'shared', name: `rules-${sharedRules[1]}`, isProjectContext: false };
  }

  const sharedSkill = rel.match(/^shared\/skills\/([^/]+)\/SKILL\.md$/);
  if (sharedSkill) {
    return { projectSlug: 'shared', name: `skills-${sharedSkill[1]}`, isProjectContext: false };
  }

  return null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('classifyFile', () => {
  describe('global context files', () => {
    it('classifies context/eclipse-che-ecosystem.md as global', () => {
      const r = classifyFile('context/eclipse-che-ecosystem.md');
      expect(r?.projectSlug).toBe('global');
      expect(r?.name).toBe('eclipse-che-ecosystem');
      expect(r?.isProjectContext).toBe(false);
    });
  });

  describe('project context.md (main, has frontmatter)', () => {
    it('classifies projects/che-dashboard/context.md correctly', () => {
      const r = classifyFile('subprojects/che-dashboard/context.md');
      expect(r?.projectSlug).toBe('che-dashboard');
      expect(r?.name).toBe('context');
      expect(r?.isProjectContext).toBe(true);
    });

    it('classifies projects/che-server/context.md correctly', () => {
      const r = classifyFile('subprojects/che-server/context.md');
      expect(r?.projectSlug).toBe('che-server');
      expect(r?.isProjectContext).toBe(true);
    });
  });

  describe('project non-context files', () => {
    it('classifies context-patternfly.md as non-main-context', () => {
      const r = classifyFile('subprojects/che-dashboard/context-patternfly.md');
      expect(r?.projectSlug).toBe('che-dashboard');
      expect(r?.name).toBe('context-patternfly');
      expect(r?.isProjectContext).toBe(false);
    });

    it('classifies rules/dev.md with dash-joined name', () => {
      const r = classifyFile('subprojects/che-dashboard/rules/dev.md');
      expect(r?.projectSlug).toBe('che-dashboard');
      expect(r?.name).toBe('rules-dev');
      expect(r?.isProjectContext).toBe(false);
    });

    it('classifies skills SKILL.md with project slug', () => {
      const r = classifyFile('subprojects/che-dashboard/skills/analyze-issue/SKILL.md');
      expect(r?.projectSlug).toBe('che-dashboard');
      expect(r?.name).toBe('skills-analyze-issue');
      expect(r?.isProjectContext).toBe(false);
    });
  });

  describe('shared files', () => {
    it('classifies shared/rules/issue-filtering.md', () => {
      const r = classifyFile('shared/rules/issue-filtering.md');
      expect(r?.projectSlug).toBe('shared');
      expect(r?.name).toBe('rules-issue-filtering');
    });

    it('classifies shared/skills/filter-issues/SKILL.md', () => {
      const r = classifyFile('shared/skills/filter-issues/SKILL.md');
      expect(r?.projectSlug).toBe('shared');
      expect(r?.name).toBe('skills-filter-issues');
    });
  });

  describe('unclassifiable files', () => {
    it('returns null for files outside known dirs', () => {
      expect(classifyFile('README.md')).toBeNull();
      expect(classifyFile('tmp/plan.md')).toBeNull();
      expect(classifyFile('node_modules/foo/bar.md')).toBeNull();
    });
  });
});
