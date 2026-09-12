/**
 * scripts/test-vertex.ts — Direct Vertex AI (Claude) provider test.
 *
 * Usage (from dev-workflow-ai root):
 *   node_modules/.bin/tsx scripts/test-vertex.ts
 *
 * Or via the test runner in dev-workflow-ai-tests/:
 *   ../dev-workflow-ai-tests/run-tests.sh
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { HumanMessage } from '@langchain/core/messages';
import { buildVertexAnthropicLLM, isVertexConfigured } from '../packages/agent-backend/src/llm/vertexAnthropicLLM.js';

// ── Load .env without dotenv dependency ───────────────────────────────────
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k) process.env[k] = v;  // always override — .env is authoritative for tests
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', N = '\x1b[0m';
let pass = 0, fail = 0;
const failures: string[] = [];
const ok  = (m: string) => { console.log(`${G}PASS${N} ${m}`); pass++; };
const bad = (m: string) => { console.log(`${R}FAIL${N} ${m}`); fail++; failures.push(m); };
const inf = (m: string) =>   console.log(`${Y}INFO${N} ${m}`);

async function main(): Promise<void> {
  console.log('=== Vertex AI (Claude) Direct Provider Test ===\n');

  const projectId = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
  const saPath    = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const model     = process.env.VERTEX_CLAUDE_MODEL ?? 'claude-sonnet-4-5@20251101';

  inf(`ANTHROPIC_VERTEX_PROJECT_ID = ${projectId ?? '(not set)'}`);
  inf(`GOOGLE_APPLICATION_CREDENTIALS = ${saPath ?? '(not set)'}`);
  inf(`VERTEX_CLAUDE_MODEL = ${model}\n`);

  if (!projectId) { bad('ANTHROPIC_VERTEX_PROJECT_ID not set — check .env'); process.exit(1); }

  // 1 — SA file
  console.log('--- Test 1: service account file ---');
  if (!saPath) {
    bad('GOOGLE_APPLICATION_CREDENTIALS not set');
  } else if (!existsSync(saPath)) {
    bad(`File not found: ${saPath}`);
  } else {
    const sa = JSON.parse(readFileSync(saPath, 'utf-8')) as Record<string, unknown>;
    ok(`SA readable — project_id=${sa.project_id}  email=${String(sa.client_email).slice(0, 50)}…`);
  }

  // 2 — isVertexConfigured
  console.log('--- Test 2: isVertexConfigured() ---');
  isVertexConfigured() ? ok('true') : bad('false');

  // 3 — build LLM instance
  console.log('--- Test 3: buildVertexAnthropicLLM() ---');
  let llm: ReturnType<typeof buildVertexAnthropicLLM>;
  try {
    llm = buildVertexAnthropicLLM();
    ok(`LLM instance created (model=${model})`);
  } catch (e) {
    bad(`buildVertexAnthropicLLM() threw: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  // 4 — invoke
  console.log('--- Test 4: invoke model with "Reply with exactly PONG" ---');
  try {
    const res = await llm.invoke([new HumanMessage('Reply with exactly the word PONG and nothing else.')]);
    const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    ok(`Model responded: "${text.trim().slice(0, 120)}"`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    bad(`invoke() failed: ${msg.slice(0, 400)}`);
    if (msg.includes('does not have access'))
      inf('→ Enable Claude: GCP Console → Vertex AI → Model Garden → search "Claude" → Enable');
    if (msg.includes('401') || msg.includes('permission'))
      inf('→ Check service account permissions: roles/aiplatform.user');
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(45)}`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
  }
  console.log('All tests passed.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
