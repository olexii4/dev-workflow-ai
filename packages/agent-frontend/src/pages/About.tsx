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
import { AboutModal, Content } from '@patternfly/react-core';
import { useBranding } from '../contexts/BrandingContext.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function About({ isOpen, onClose }: Props) {
  const branding = useBranding();

  return (
    <AboutModal
      isOpen={isOpen}
      onClose={onClose}
      brandImageSrc="https://cdn-icons-png.flaticon.com/512/1766/1766950.png"
      brandImageAlt={`${branding.name} logo`}
      backgroundImageSrc="/branding/pf-background.svg"
      productName={branding.name}
    >
      <Content>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '16px 24px' }}>
          <dt>Version</dt>
          <dd>{branding.productVersion}</dd>
          <dt>Description</dt>
          <dd>{branding.description}</dd>
          <dt>LLM Backend</dt>
          <dd>Ollama / Claude / Gemini / OpenCode</dd>
          <dt>License</dt>
          <dd>
            <a href="https://www.eclipse.org/legal/epl-2.0/" target="_blank" rel="noreferrer">
              Eclipse Public License 2.0
            </a>
          </dd>
        </dl>
      </Content>
    </AboutModal>
  );
}
