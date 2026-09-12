#!/usr/bin/env tsx
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
 * run-issue-stub.ts — run the agent pipeline without a database or LLM.
 *
 * Clones the target repo to /tmp/dwa-repos/<owner>/<repo> (or pulls if
 * already present), reads real source files to identify affected code,
 * then writes analysis.md + pr-description.md + changes.patch.
 *
 * Usage:
 *   npx tsx scripts/run-issue-stub.ts https://github.com/eclipse-che/che-dashboard/issues/1234
 *   npx tsx scripts/run-issue-stub.ts <url> --project=che-dashboard --output=./my-output
 */

import { readFile, readdir, stat, mkdir, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const issueUrl = args.find(a => a.startsWith('http')) ?? '';
const projectOverride = args.find(a => a.startsWith('--project='))?.split('=')[1] ?? '';
const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1] ?? 'output';
const samplesDir =
  args.find(a => a.startsWith('--samples='))?.split('=')[1] ??
  resolve(process.cwd(), 'pg_seed/eclipse-che');

if (!issueUrl) {
  console.error('Usage: tsx scripts/run-issue-stub.ts <github-issue-url> [options]');
  process.exit(1);
}

// ── Parse URL ───────────────────────────────────────────────────────────────

const urlMatch = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
if (!urlMatch) {
  console.error('Cannot parse GitHub issue URL:', issueUrl);
  process.exit(1);
}
const [, owner, repo, issueNumStr] = urlMatch;
const issueNumber = parseInt(issueNumStr);
const repoSlug = `${owner}/${repo}`;
const TMP_REPOS = '/tmp/dwa-repos';

const REPO_MAP: Record<string, string> = {
  'eclipse-che/che-dashboard': 'che-dashboard',
  'eclipse-che/che-server': 'che-server',
  'eclipse-che/che': 'che-dashboard',
  'eclipse-che/che-docs': 'che-docs',
  'devfile/devworkspace-operator': 'devworkspace-operator',
  'che-incubator/devworkspace-generator': 'devworkspace-generator',
  'che-incubator/che-ai-tool-images': 'che-ai-tool-images',
  'che-incubator/dash-licenses': 'dash-licenses',
};

const project = projectOverride || REPO_MAP[repoSlug] || repo;

console.log('─────────────────────────────────────────────');
console.log('  dev-workflow-ai — STUB run (no DB, no LLM)');
console.log('─────────────────────────────────────────────');
console.log(`  Issue:   ${issueUrl}`);
console.log(`  Project: ${project} (${repoSlug})`);
console.log(`  Output:  ${outputDir}/`);
console.log('─────────────────────────────────────────────');
console.log();

// ── Load context from sample files ─────────────────────────────────────────

async function loadContextFromFiles(projectSlug: string): Promise<string> {
  const parts: string[] = [];
  const toTry = [
    join(samplesDir, 'context', 'eclipse-che-ecosystem.md'),
    join(samplesDir, 'subprojects', projectSlug, 'context.md'),
    join(samplesDir, 'subprojects', projectSlug, 'rules', 'dev.md'),
    join(samplesDir, 'shared', 'rules', 'issue-analysis.md'),
  ];
  for (const p of toTry) {
    try {
      const content = await readFile(p, 'utf8');
      const name = p.split('/').slice(-2).join('/');
      parts.push(`## ${name}\n\n${content}`);
    } catch { /* file doesn't exist */ }
  }
  return parts.join('\n\n---\n\n');
}

// ── Clone or update repo ────────────────────────────────────────────────────

async function ensureRepo(): Promise<string> {
  const repoPath = join(TMP_REPOS, owner, repo);
  await mkdir(join(TMP_REPOS, owner), { recursive: true });

  try {
    await access(join(repoPath, '.git'));
    // Already cloned — pull latest
    console.log(`      ↻ Pulling latest ${repoSlug}...`);
    await execAsync('git fetch origin && git checkout main && git pull -p', {
      cwd: repoPath,
      timeout: 60_000,
    }).catch(() => {
      // Try master if main doesn't exist
      return execAsync('git checkout master && git pull -p', { cwd: repoPath, timeout: 60_000 });
    });
  } catch {
    // Clone fresh
    console.log(`      ↓ Cloning ${repoSlug} to ${repoPath}...`);
    const token = process.env.GITHUB_TOKEN;
    const url = token
      ? `https://${token}@github.com/${repoSlug}.git`
      : `https://github.com/${repoSlug}.git`;
    await execAsync(`git clone --depth=50 "${url}" "${repoPath}"`, { timeout: 120_000 });
  }

  const { stdout: headCommit } = await execAsync('git log -1 --format="%h %s"', { cwd: repoPath });
  console.log(`      ✓ ${repoSlug} @ ${headCommit.trim()}`);
  return repoPath;
}

// ── Fetch issue from GitHub API ─────────────────────────────────────────────

async function fetchIssue() {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'dev-workflow-ai-stub',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{
    title: string;
    body: string;
    labels: { name: string }[];
    html_url: string;
  }>;
}

// ── Search real repo files ──────────────────────────────────────────────────

async function findAffectedFiles(
  repoPath: string,
  title: string,
  body: string,
): Promise<string[]> {
  const text = (title + ' ' + (body || '')).toLowerCase();
  const found: string[] = [];

  // Extract keywords from issue text
  const keywords: string[] = [];
  // Package/dependency names (e.g. "jsonpath-plus", "axios", "webpack")
  const pkgMatch = title.match(/upgrade\s+(\S+)|update\s+(\S+)|bump\s+(\S+)/i);
  if (pkgMatch) keywords.push((pkgMatch[1] || pkgMatch[2] || pkgMatch[3]).toLowerCase());

  // Component names (PascalCase or kebab-case)
  const compMatch = title.match(/([A-Z][a-zA-Z]+(?:Component|Page|Modal|List)?)/g);
  if (compMatch) keywords.push(...compMatch.map(k => k.toLowerCase()));

  // Search package.json for dependency upgrades
  if (text.includes('upgrade') || text.includes('update') || text.includes('bump')) {
    const pkgFiles: string[] = [];
    try {
      const { stdout } = await execAsync(
        'find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*"',
        { cwd: repoPath, timeout: 10_000 },
      );
      pkgFiles.push(...stdout.trim().split('\n').filter(Boolean).map(f => f.replace(/^\.\//, '')));
    } catch { /* ignore */ }
    found.push(...pkgFiles);
  }

  // Search for files matching keywords in the repo
  for (const kw of keywords.filter(k => k.length > 3)) {
    try {
      const { stdout } = await execAsync(
        `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \\) \
         -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/lib/*" \
         | xargs grep -l "${kw}" 2>/dev/null | head -5`,
        { cwd: repoPath, timeout: 15_000 },
      );
      found.push(...stdout.trim().split('\n').filter(Boolean).map(f => f.replace(/^\.\//, '')));
    } catch { /* ignore */ }
  }

  // Deduplicate
  const unique = [...new Set(found)].slice(0, 8);
  return unique.length > 0 ? unique : [`src/`];
}

// ── Create branch + stub patch ──────────────────────────────────────────────

async function createBranchAndPatch(
  repoPath: string,
  branchName: string,
  affectedFiles: string[],
  issueTitle: string,
): Promise<string> {
  // Create branch from main/master
  await execAsync(
    `git checkout main 2>/dev/null || git checkout master && git checkout -b ${branchName}`,
    { cwd: repoPath, timeout: 30_000 },
  ).catch(() => {});

  // For dependency upgrades: show what package.json contains for the dep
  let patchContent = '';
  const isDependencyUpgrade =
    issueTitle.toLowerCase().includes('upgrade') ||
    issueTitle.toLowerCase().includes('update') ||
    issueTitle.toLowerCase().includes('bump');

  if (isDependencyUpgrade) {
    // Extract package name from title
    const pkgName = issueTitle.match(
      /(?:upgrade|update|bump)\s+([a-z@][a-z0-9@/._-]+)/i,
    )?.[1]?.toLowerCase();

    if (pkgName) {
      for (const f of affectedFiles.filter(f => f.endsWith('package.json'))) {
        try {
          const content = await readFile(join(repoPath, f), 'utf8');
          const pkg = JSON.parse(content);
          const allDeps = {
            ...(pkg.dependencies ?? {}),
            ...(pkg.devDependencies ?? {}),
          };
          const currentVersion = allDeps[pkgName];
          if (currentVersion) {
            patchContent += `# ${f}: ${pkgName} is currently at ${currentVersion}\n`;
            patchContent += `# The fix would upgrade it to the version specified in the issue.\n\n`;
          }
        } catch { /* ignore */ }
      }
    }
  }

  // Show first 30 lines of each affected file for context
  let fileContext = '';
  for (const f of affectedFiles.slice(0, 3)) {
    if (f.endsWith('/') || f === 'src/') continue;
    try {
      const content = await readFile(join(repoPath, f), 'utf8');
      const lines = content.split('\n').slice(0, 30);
      fileContext += `\n# ── ${f} (first 30 lines) ──\n`;
      fileContext += lines.map((l, i) => `# ${String(i + 1).padStart(3)}: ${l}`).join('\n');
      fileContext += '\n';
    } catch { /* ignore */ }
  }

  // Generate a diff skeleton
  const { stdout: gitDiff } = await execAsync(`git diff main...${branchName} 2>/dev/null || echo ""`, {
    cwd: repoPath,
    timeout: 10_000,
  }).catch(() => ({ stdout: '' }));

  return (
    `# Stub patch for ${repoSlug}#${issueNumber}\n` +
    `# Branch: ${branchName}\n` +
    `# Cloned to: ${repoPath}\n` +
    `#\n` +
    (patchContent || '') +
    (fileContext || '') +
    (gitDiff.trim()
      ? `\n# Git diff (branch is empty — no real changes made in stub mode):\n${gitDiff}`
      : `\n# No diff yet — branch created but no files modified.\n` +
        `# Run the real agent to implement the fix:\n` +
        `#   GEMINI_API_KEY=<key> ./scripts/test-local.sh ${issueUrl}\n` +
        `#   ollama pull qwen2.5-coder:7b && ./scripts/test-local.sh ${issueUrl}\n`)
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('[1/5] Loading context from sample files...');
const context = await loadContextFromFiles(project);
const contextLines = context.split('\n').length;
console.log(`      ✓ ${contextLines} lines loaded`);

console.log('[2/5] Fetching issue from GitHub API...');
let issue: { title: string; body: string; labels: { name: string }[]; html_url: string };
try {
  issue = await fetchIssue();
  console.log(`      ✓ #${issueNumber}: ${issue.title}`);
  if (issue.labels.length) console.log(`      Labels: ${issue.labels.map(l => l.name).join(', ')}`);
} catch (e) {
  console.error(`      ✗ Failed: ${e}`);
  process.exit(1);
}

console.log('[3/5] Cloning / updating repository...');
let repoPath = '';
try {
  repoPath = await ensureRepo();
} catch (e) {
  console.warn(`      ⚠ Clone failed: ${e}`);
  console.warn('       Continuing without repo (no patch will be generated)');
}

console.log('[4/5] Analyzing real repository files...');
const branchName = `issue-${issueNumber}-${issue.title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .slice(0, 40)}`;

let affectedFiles: string[] = [];
let patchText = '';

if (repoPath) {
  affectedFiles = await findAffectedFiles(repoPath, issue.title, issue.body || '');
  console.log(`      ✓ Found ${affectedFiles.length} relevant file(s):`);
  affectedFiles.slice(0, 5).forEach(f => console.log(`        • ${f}`));

  patchText = await createBranchAndPatch(repoPath, branchName, affectedFiles, issue.title);
} else {
  affectedFiles = ['src/'];
  patchText = `# Clone failed — no patch generated\n# Run manually: git clone https://github.com/${repoSlug}.git\n`;
}

const storyPoints =
  issue.title.toLowerCase().includes('typo') || issue.title.toLowerCase().includes('bump') ? 1
  : (issue.body || '').length > 1500 ? 3
  : 2;

console.log('[5/5] Writing output files...');
const slug = `${owner}-${repo}-${issueNumber}`;
const outDir = resolve(outputDir, slug);
await mkdir(outDir, { recursive: true });

const analysisText = `# Issue Analysis

**Issue:** ${issueUrl}
**Title:** ${issue.title}
**Labels:** ${issue.labels.map(l => l.name).join(', ') || 'none'}
**Project:** ${project} (${repoSlug})
**Story Points:** ${storyPoints}
**Cloned to:** ${repoPath || 'N/A (clone failed)'}

## Affected Files (from real repo search)

${affectedFiles.map(f => `- \`${f}\``).join('\n')}

## Suggested Branch

\`${branchName}\`

## Context Loaded

${contextLines} lines from pg_seed/eclipse-che/

## Next Steps

Run with a real LLM to implement the fix:
\`\`\`bash
GEMINI_API_KEY=<key> ./scripts/test-local.sh ${issueUrl}
# or:
ollama pull qwen2.5-coder:7b && ./scripts/test-local.sh ${issueUrl}
\`\`\`
`;

const prDescriptionText = `# fix(${project}): ${issue.title}

## Summary

<!-- The real agent would write the fix summary here -->
<!-- Affected: ${affectedFiles.join(', ')} -->

Addresses: ${issueUrl}

## Changes

${affectedFiles.map(f => `- \`${f}\``).join('\n')}

## Issue

Closes #${issueNumber}

## Test plan

- [ ] Unit tests pass
- [ ] Lint and format clean
- [ ] Manual verification

## Labels

${issue.labels.map(l => `\`${l.name}\``).join(' · ') || 'none'}

---
*Stub mode — run with Gemini or Ollama to get a real implementation*
`;

await writeFile(join(outDir, 'analysis.md'), analysisText, 'utf8');
await writeFile(join(outDir, 'pr-description.md'), prDescriptionText, 'utf8');
await writeFile(join(outDir, 'changes.patch'), patchText, 'utf8');

console.log(`      ✓ Written to ${outDir}/`);
console.log();
console.log('─────────────────────────────────────────────');
console.log('  Done');
console.log('─────────────────────────────────────────────');
console.log();
console.log(`  Repo clone:      ${repoPath || 'failed'}`);
console.log(`  analysis.md:     ${affectedFiles.length} affected files`);
console.log(`  changes.patch:   ${patchText.split('\n').length} lines`);
