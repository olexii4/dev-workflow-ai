/*
 * Copyright (c) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: EPL-2.0
 */

import { createReducer } from '@reduxjs/toolkit';
import type { Project } from '@/services/api/projectsService';
import { fetchProjects } from './actions';

export interface State {
  items: Project[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number;
}

const unloadedState: State = { items: [], loading: false, error: null, lastFetchedAt: 0 };

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(fetchProjects.pending, state => { state.loading = true; state.error = null; })
    .addCase(fetchProjects.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
      state.lastFetchedAt = Date.now();
    })
    .addCase(fetchProjects.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? 'Unknown error';
    })
    .addDefaultCase(state => state),
);
