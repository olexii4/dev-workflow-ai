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

import React, { createContext, useContext, useEffect } from 'react';

interface ThemeContextValue {
  isDarkTheme: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ isDarkTheme: true });

/** Always dark — applies pf-v6-theme-dark to <html> on mount. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('pf-v6-theme-dark');
  }, []);

  return <ThemeContext.Provider value={{ isDarkTheme: true }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
