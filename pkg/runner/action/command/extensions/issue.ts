import path from 'node:path';

import type { CommandExtension } from '.';
import ActionCommandManager from '../manager';

const Properties = {
  File: 'file',
  Line: 'line',
  EndLine: 'endLine',
  Column: 'col',
  EndColumn: 'endColumn',
  Title: 'title',
};

const IssueCommandExtension: CommandExtension = {
  command: '',

  echo: false,

  process(runner, command) {
    const { properties } = command;
    let { file, line, column } = properties;

    if (!runner.enhancedAnnotationsEnabled) {
      // runner.debug("Enhanced Annotations not enabled on the server. The 'title', 'end_line', and 'end_column' fields are unsupported.");
    }

    if (file) {
      if (runner.container) {
        file = runner.container.resolve(file);
        properties[Properties.File] = file;
      }

      // Get the values that represent the server path given a local path
      const repoName = runner.context.github.repository;
      const repoPath = runner.context.github.workspace;

      const relativeSourcePath = path.relative(repoPath, file);

      if (relativeSourcePath !== file) {
        if (repoName) {
          properties.repo = repoName;
        }
        if (relativeSourcePath) {
          properties[Properties.File] = relativeSourcePath.replace(/\\/g, path.sep);
        }
      }
    }

    // todo AddIssue
  },
};

export default IssueCommandExtension;
