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

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../pages/Login.js';

vi.mock('../contexts/BrandingContext.js', () => ({
  useBranding: () => ({
    name: 'Workflow AI',
    productVersion: '0.2.0',
    logoFile: 'branding/icon.png',
    logoTextFile: 'branding/logo-text.svg',
    favicon: 'branding/favicon.png',
    title: 'Workflow AI',
    description: 'Autonomous AI software engineer',
    links: [],
  }),
  BrandingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Login', () => {
  beforeEach(() => {
    document.title = '';
    // Prevent actual redirect during tests
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { asFragment } = render(<Login />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows a connecting message (OpenShift gateway handles auth)', () => {
    const { getByText } = render(<Login />);
    expect(getByText(/Redirecting to OpenShift login/)).toBeDefined();
  });

  it('shows the product name in the title', () => {
    const { getByText } = render(<Login />);
    expect(getByText(/Connecting to Workflow AI/)).toBeDefined();
  });
});
