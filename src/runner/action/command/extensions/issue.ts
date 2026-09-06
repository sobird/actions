import path from 'node:path';

import { create } from '@bufbuild/protobuf';

import { Constants } from '@/common/constants';
import type { IssueType } from '@/gen/runner/v1/messages_pb.ts';
import { IssueSchema } from '@/gen/runner/v1/messages_pb.ts';
import type Runner from '@/runner';

import type { CommandExtension } from '.';
import type ActionCommand from '..';

const Properties = {
  File: 'file',
  Line: 'line',
  EndLine: 'endLine',
  Column: 'col',
  EndColumn: 'endColumn',
  Title: 'title',
};

/**
 * ::error:: / ::warning:: / ::notice:: 的共用逻辑
 * 对应官方 IssueCommandExtension.ProcessCommand（ActionCommandManager.cs:630）
 */
export function IssueCommandExtension(command: string, type: IssueType): CommandExtension {
  return {
    command,
    echo: false,

    process(runner, actionCommand) {
      const { properties } = actionCommand;

      ValidateLinesAndColumns(actionCommand, runner);

      if (!runner.EnhancedAnnotationsEnabled) {
        runner.debug(
          "Enhanced Annotations not enabled on the server. The 'title', 'end_line', and 'end_column' fields are unsupported.",
        );
      }

      const issue = create(IssueSchema, {
        category: 'General',
        type,
        message: actionCommand.data,
        data: {},
      });

      const file = properties[Properties.File];
      if (file) {
        issue.category = 'Code';

        // 容器内路径 -> 宿主机路径（官方 container.TranslateToHostPath）
        const hostFile = runner.container ? runner.container.resolve(file) : file;
        properties[Properties.File] = hostFile;

        // 宿主机绝对路径 -> 仓库相对路径（服务端以仓库为根定位文件）
        const repoName = runner.context.github.repository;
        const repoPath = runner.context.github.workspace;

        const relativeSourcePath = path.relative(repoPath, hostFile);
        if (relativeSourcePath !== hostFile) {
          if (repoName) {
            properties.repo = repoName;
          }
          if (relativeSourcePath) {
            // 官方统一为 '/' 分隔
            properties[Properties.File] = relativeSourcePath.replace(/\\/g, '/');
          }
        }
      }

      for (const [key, value] of Object.entries(properties)) {
        if (key !== Constants.Runner.InternalTelemetryIssueDataKey) {
          issue.data[key] = value;
        }
      }

      runner.addIssue(issue);
    },
  };
}

const tryParse = (value?: string) => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
};

/**
 * 对应官方 IssueCommandExtension.ValidateLinesAndColumns（ActionCommandManager.cs:694）
 * 只修正/清理 properties，不抛错。
 */
function ValidateLinesAndColumns(command: ActionCommand, runner: Runner) {
  const { properties } = command;
  const { Line, EndLine, Column, EndColumn } = Properties;

  let line = properties[Line];
  let endLine = properties[EndLine];
  let column = properties[Column];
  let endColumn = properties[EndColumn];

  const lineNumber = tryParse(line);
  const endLineNumber = tryParse(endLine);
  const columnNumber = tryParse(column);
  const endColumnNumber = tryParse(endColumn);

  let hasStartLine = lineNumber !== undefined;
  let hasEndLine = endLineNumber !== undefined;
  let hasStartColumn = columnNumber !== undefined;
  let hasEndColumn = endColumnNumber !== undefined;
  const hasColumn = hasStartColumn || hasEndColumn;

  if (hasEndLine && !hasStartLine) {
    runner.debug(`Invalid ${command.command} command value. '${EndLine}' can only be set if '${Line}' is provided`);
    properties[Line] = endLine!;
    line = endLine;
    hasStartLine = true;
  }

  if (hasEndColumn && !hasStartColumn) {
    runner.debug(`Invalid ${command.command} command value. '${EndColumn}' can only be set if '${Column}' is provided`);
    properties[Column] = endColumn!;
    column = endColumn;
    hasStartColumn = true;
  }

  if (!hasStartLine && hasColumn) {
    runner.debug(
      `Invalid ${command.command} command value. '${Column}' and '${EndColumn}' can only be set if '${Line}' value is provided.`,
    );
    delete properties[Column];
    delete properties[EndColumn];
  }

  if (hasEndLine && line !== endLine && hasColumn) {
    runner.debug(
      `Invalid ${command.command} command value. '${Column}' and '${EndColumn}' cannot be set if '${Line}' and '${EndLine}' are different values.`,
    );
    delete properties[Column];
    delete properties[EndColumn];
  }

  if (
    hasStartLine &&
    hasEndLine &&
    endLineNumber !== undefined &&
    lineNumber !== undefined &&
    endLineNumber < lineNumber
  ) {
    runner.debug(`Invalid ${command.command} command value. '${EndLine}' cannot be less than '${Line}'.`);
    delete properties[Line];
    delete properties[EndLine];
  }

  if (
    hasStartColumn &&
    hasEndColumn &&
    endColumnNumber !== undefined &&
    columnNumber !== undefined &&
    endColumnNumber < columnNumber
  ) {
    runner.debug(`Invalid ${command.command} command value. '${EndColumn}' cannot be less than '${Column}'.`);
    delete properties[Column];
    delete properties[EndColumn];
  }
}
