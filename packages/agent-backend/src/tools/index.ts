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

import { bashTool } from './bash.js';
import {
  ghIssueTool,
  ghIssueListTool,
  ghIssueEditTool,
  ghPrCreateTool,
  ghPrDiffTool,
  ghPrCommentTool,
} from './github.js';

export const allTools = [
  bashTool,
  ghIssueTool,
  ghIssueListTool,
  ghIssueEditTool,
  ghPrCreateTool,
  ghPrDiffTool,
  ghPrCommentTool,
];
