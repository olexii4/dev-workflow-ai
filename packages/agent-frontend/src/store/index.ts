/*
 * Copyright (c) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: EPL-2.0
 */

import { configureStore } from '@reduxjs/toolkit';
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import { runsReducer } from './Runs';
import { projectsReducer } from './Projects';

export const store = configureStore({
  reducer: {
    runs: runsReducer,
    projects: projectsReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = Promise<void>> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;
