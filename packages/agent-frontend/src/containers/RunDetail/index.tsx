/*
 * Copyright (c) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: EPL-2.0
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RunDetailPage from '@/pages/RunDetail';

export default function RunDetailContainer(): React.ReactElement {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  return (
    <RunDetailPage
      threadId={threadId}
      onBack={() => navigate('/dashboard')}
    />
  );
}
