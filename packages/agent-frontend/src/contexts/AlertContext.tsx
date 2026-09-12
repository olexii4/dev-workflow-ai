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

import React, { createContext, useCallback, useContext, useState } from 'react';

export type AlertVariant = 'success' | 'danger' | 'warning' | 'info';

export interface AlertItem {
  key: string;
  variant: AlertVariant;
  title: string;
  timeout: number;
}

interface AlertContextValue {
  alerts: AlertItem[];
  addAlert: (variant: AlertVariant, title: string) => void;
  removeAlert: (key: string) => void;
}

const TIMEOUTS: Record<AlertVariant, number> = {
  success: 2000,
  info: 8000,
  warning: 20000,
  danger: 20000,
};

const AlertContext = createContext<AlertContextValue>({
  alerts: [],
  addAlert: () => {},
  removeAlert: () => {},
});

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const removeAlert = useCallback((key: string) => {
    setAlerts(prev => prev.filter(a => a.key !== key));
  }, []);

  const addAlert = useCallback(
    (variant: AlertVariant, title: string) => {
      const key = `${Date.now()}-${Math.random()}`;
      const timeout = TIMEOUTS[variant];
      setAlerts(prev => [...prev, { key, variant, title, timeout }]);
      setTimeout(() => removeAlert(key), timeout);
    },
    [removeAlert],
  );

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertContext);
