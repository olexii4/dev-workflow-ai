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
import { describe, it, expect } from 'vitest';
import AppearanceToggle from '../components/AppearanceToggle.js';

describe('AppearanceToggle', () => {
  it('renders nothing (always-dark theme, no toggle)', () => {
    const { container } = render(<AppearanceToggle />);
    expect(container.firstChild).toBeNull();
  });

  it('matches snapshot (empty)', () => {
    const { asFragment } = render(<AppearanceToggle />);
    expect(asFragment()).toMatchSnapshot();
  });
});
