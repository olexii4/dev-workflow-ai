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

import { Banner } from '@patternfly/react-core';
import React, { useEffect, useRef, useState } from 'react';

const RECONNECT_INTERVAL_MS = 5000;

export default function WsBanner() {
  const [disconnected, setDisconnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setDisconnected(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    ws.onerror = () => {
      setDisconnected(true);
    };

    ws.onclose = () => {
      setDisconnected(true);
      timerRef.current = setTimeout(connect, RECONNECT_INTERVAL_MS);
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, []);

  if (!disconnected) return null;

  return (
    <Banner status="warning" style={{ textAlign: 'center' }}>
      WebSocket connection lost — live updates may be delayed. Reconnecting…
    </Banner>
  );
}
