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

export interface ProjectRow {
  id: number;
  name: string;
  repo: string;
  local_path: string;
  default_branch: string;
  stack: string[];
  description: string;
  auto_approve_min_priority: string;
  story_point_budget: number;
  created_at: Date;
  updated_at: Date;
}

export interface ContextRow {
  id: number;
  project_slug: string;
  name: string;
  content: string;
  source_file: string;
  updated_at: Date;
}

export interface AgentRunRow {
  id: number;
  thread_id: string;
  project_slug: string;
  repo: string;
  issue_number: number | null;
  issue_title: string;
  issue_url: string;
  priority: string;
  priority_source: string;
  jira_key: string;
  status: string;
  pr_url: string;
  pr_number: number | null;
  verdict: string;
  story_points: number;
  started_at: Date;
  finished_at: Date | null;
}

export interface RunEventRow {
  id: number;
  thread_id: string;
  phase: string;
  node: string;
  message: string;
  level: string;
  ts: Date;
}

export interface FindingRow {
  id: number;
  thread_id: string;
  file: string;
  line: number | null;
  severity: string;
  finding: string;
  tier: string;
  ts: Date;
}
