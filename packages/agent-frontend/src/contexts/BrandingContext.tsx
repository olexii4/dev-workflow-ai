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

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface BrandingLink {
  text: string;
  href: string;
}

export interface Branding {
  name: string;
  productVersion: string;
  logoFile: string;
  logoTextFile: string;
  favicon: string;
  title: string;
  description: string;
  links: BrandingLink[];
}

const DEFAULT_BRANDING: Branding = {
  name: 'Workflow AI',
  productVersion: '0.2.0',
  logoFile: 'branding/icon.png',
  logoTextFile: 'branding/logo-text.svg',
  favicon: 'branding/favicon.png',
  title: 'Workflow AI',
  description: 'Autonomous AI software engineer',
  links: [],
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    fetch('/branding/product.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data: Branding | null) => {
        if (data) setBranding({ ...DEFAULT_BRANDING, ...data });
      })
      .catch(() => {});
  }, []);

  // Apply branding CSS and document title
  useEffect(() => {
    document.title = branding.title;
    // Load branding.css if not already loaded
    const id = 'branding-css';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = '/branding/branding.css';
      document.head.appendChild(link);
    }
  }, [branding]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
