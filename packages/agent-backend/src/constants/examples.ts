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

export const providerTestExample = {
  get prompt() {
    return 'What model are you and who made you? One sentence.';
  },
  get provider_id() {
    return 'vertex';
  },
};

export const startRunExample = {
  get issueUrl() {
    return 'https://github.com/eclipse-che/che-dashboard/issues/1234';
  },
  get forcePriority() {
    return false;
  },
};
