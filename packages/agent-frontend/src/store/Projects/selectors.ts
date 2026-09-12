/*
 * Copyright (c) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: EPL-2.0
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/index';

const selectProjectsState = (state: RootState) => state.projects;
export const selectProjects = createSelector(selectProjectsState, s => s.items);
export const selectProjectsLoading = createSelector(selectProjectsState, s => s.loading);
