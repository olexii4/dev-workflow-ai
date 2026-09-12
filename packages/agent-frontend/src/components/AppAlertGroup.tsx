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

import { Alert, AlertActionCloseButton, AlertGroup } from '@patternfly/react-core';
import React from 'react';
import ReactDOM from 'react-dom';
import { useAlerts } from '../contexts/AlertContext.js';

export default function AppAlertGroup() {
  const { alerts, removeAlert } = useAlerts();
  if (alerts.length === 0) return null;

  return ReactDOM.createPortal(
    <AlertGroup className="pf-m-toast">
      {alerts.map(a => (
        <Alert
          key={a.key}
          variant={a.variant}
          title={a.title}
          timeout={a.timeout}
          onTimeout={() => removeAlert(a.key)}
          actionClose={<AlertActionCloseButton onClose={() => removeAlert(a.key)} />}
        />
      ))}
    </AlertGroup>,
    document.body,
  );
}
