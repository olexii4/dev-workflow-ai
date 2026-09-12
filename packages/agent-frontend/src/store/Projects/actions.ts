/*
 * Copyright (c) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: EPL-2.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import * as projectsService from '@/services/api/projectsService';
import type { Project } from '@/services/api/projectsService';
import type { RootState } from '@/store/index';

const CACHE_TTL_MS = 30_000;

export const fetchProjects = createAsyncThunk<
  Project[],
  { force?: boolean } | undefined,
  { state: RootState; rejectValue: string }
>(
  'projects/fetchProjects',
  async (_arg, { rejectWithValue }) => {
    try { return await projectsService.getProjects(); }
    catch (e) { return rejectWithValue(e instanceof Error ? e.message : 'Failed'); }
  },
  {
    condition: (arg, { getState }) => {
      if (arg?.force) return true;
      return Date.now() - getState().projects.lastFetchedAt > CACHE_TTL_MS;
    },
  },
);
