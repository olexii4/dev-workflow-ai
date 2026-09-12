/*
 * Copyright (c) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: EPL-2.0
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/index';

const selectRunsState = (state: RootState) => state.runs;

export const selectRuns = createSelector(selectRunsState, s => s.items);
export const selectRunsLoading = createSelector(selectRunsState, s => s.loading);
export const selectRunsError = createSelector(selectRunsState, s => s.error);
export const selectActiveRuns = createSelector(selectRuns, runs => runs.filter(r => r.status === 'running'));
export const selectRunById = (threadId: string) =>
  createSelector(selectRuns, runs => runs.find(r => r.thread_id === threadId));
