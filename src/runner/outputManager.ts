// https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/OutputManager.cs
import fs from 'node:fs';
import path from 'node:path';

import { create } from '@bufbuild/protobuf';
import { Mutex } from 'async-mutex';

import { IssueType, IssueSchema } from '@/gen/runner/v1/messages_pb';

import type Runner from '.';
import { IssueMatcher, IssueMatch } from './action/command/issueMatcher';
import ActionCommandManager from './action/command/manager';
import { withVerbatimLogger } from './logger.ts';

export default class OutputManager {
  colorCodePrefix = '\x1b[';
  colorCodeRegex = /\\x1b\[[0-9;]*m?/g;

  maxAttempts = 3;
  failsafe = 50;

  directoryMap = new Map();
  matchers: IssueMatcher[] = [];

  timeoutKey = 'GITHUB_ACTIONS_RUNNER_ISSUE_MATCHER_TIMEOUT';

  private lineQueue = new Mutex();

  constructor(
    public runner: Runner,
    public actionCommandManager = new ActionCommandManager(runner),
  ) {}

  async onDataReceived(line: string) {
    return this.lineQueue.runExclusive(() =>
      withVerbatimLogger(async () => {
        if (await this.actionCommandManager.process(line)) {
          return;
        }

        // Handle issue matchers
        if (this.matchers.length > 0) {
          const stripped = line.includes(this.colorCodePrefix) ? line.replace(this.colorCodeRegex, '') : line;

          for (const matcher of this.matchers) {
            let match = null;
            for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
              try {
                match = matcher.match(stripped);
                break;
              } catch (error) {
                if (attempt < this.maxAttempts) {
                  this.runner.debug(
                    `Timeout processing issue matcher '${matcher.owner}' against line '${stripped}'. Exception: ${error}`,
                  );
                } else {
                  // this.runner.warning(`Removing issue matcher '${matcher.owner}'. Matcher failed ${this.maxAttempts} times. Error: ${error.message}`);
                  this.removeMatcher(matcher);
                }
              }
            }

            if (match) {
              // Reset other matchers
              this.matchers
                .filter((m) => {
                  return m !== matcher;
                })
                .forEach((m) => {
                  return m.reset();
                });

              // Convert to issue
              const issue = this.convertToIssue(match);
              if (issue) {
                const logOptions = { logMessage: stripped };
                this.runner.addIssue(issue, logOptions);
                return;
              }
            }
          }
        }

        // Handle fatal errors
        if (line.toLowerCase().includes('fatal: unsafe repository')) {
          // this.runner.stepTelemetry.errorMessages.push(line);
        }

        // Regular output
        this.runner.output(line);
      }),
    );
  }

  removeMatcher(matcher: IssueMatcher) {
    this.matchers = this.matchers.filter((m) => {
      return m !== matcher;
    });
  }

  convertToIssue(match: IssueMatch) {
    if (!match.message || !match.message.trim()) {
      this.runner.debug('Skipping logging an issue for the matched line because the message is empty.');
      return null;
    }

    const issueType = this.getIssueType(match.severity);
    if (!issueType) {
      this.runner.debug(
        `Skipped logging an issue for the matched line because the severity '${match.severity}' is not supported.`,
      );
      return null;
    }

    const issue = create(IssueSchema, {
      message: match.message,
      type: issueType,
      data: {},
    });

    if (match.line) {
      const line = Number(match.line);
      if (!isNaN(line) && Number.isInteger(line) && line >= 0) {
        issue.data['line'] = line.toString();
      } else {
        this.runner.debug(`Unable to parse line number '${match.line}'`);
      }
    }

    if (match.column) {
      const column = Number(match.column);
      if (!isNaN(column) && Number.isInteger(column) && column >= 0) {
        issue.data['col'] = column.toString();
      } else {
        this.runner.debug(`Unable to parse column number '${match.column}'`);
      }
    }

    if (match.code && match.code.trim()) {
      issue.data.code = match.code.trim();
    }

    if (match.file) {
      try {
        let filePath = match.file;
        if (match.fromPath && !path.isAbsolute(filePath)) {
          const fromDir = path.dirname(match.fromPath);
          filePath = path.join(fromDir, filePath);
        }

        if (!path.isAbsolute(filePath)) {
          const { workspace } = this.runner.context.github;
          if (!workspace) {
            throw new Error('Workspace path is not defined.');
          }
          filePath = path.join(workspace, filePath);
        }

        filePath = path.resolve(filePath);

        if (this.runner.container) {
          filePath = this.runner.container.resolve(filePath);
          filePath = path.resolve(filePath);
        }

        if (fs.existsSync(filePath)) {
          const repoPath = this.getRepositoryPath(filePath);
          if (repoPath) {
            const relativePath = filePath.slice(repoPath.length).replace(/\\/g, '/');
            issue.data.file = relativePath;
          } else {
            this.runner.debug(`Dropping file value '${filePath}'. Path is not under the workflow repo.`);
          }
        } else {
          this.runner.debug(`Dropping file value '${filePath}'. Path does not exist.`);
        }
      } catch (error) {
        this.runner.debug(
          `Dropping file value '${match.file}' and fromPath value '${match.fromPath}'. Exception during validation: ${error}`,
        );
      }
    }

    return issue;
  }

  getIssueType(severity?: string) {
    if (!severity || severity.toLowerCase() === 'error') {
      return IssueType.ERROR;
    }
    if (severity.toLowerCase() === 'warning') {
      return IssueType.WARNING;
    }
    if (severity.toLowerCase() === 'notice') {
      return IssueType.NOTICE;
    }
    return null;
  }

  getRepositoryPath(filePath: string, recursion = 0): string {
    if (this.directoryMap.size > 100) {
      this.directoryMap.clear();
    }

    const dirPath = path.dirname(filePath);
    if (!dirPath || recursion > this.failsafe) {
      return '';
    }

    if (this.directoryMap.has(dirPath)) {
      return this.directoryMap.get(dirPath);
    }

    let repoPath = '';
    try {
      const gitConfigPath = path.join(dirPath, '.git', 'config');
      if (fs.existsSync(gitConfigPath)) {
        const serverUrl = this.runner.context.github.server_url || 'https://github.com';
        const { host } = new URL(serverUrl);
        const nameWithOwner = this.runner.context.github.repository;
        const patterns = [`url = ${serverUrl}/${nameWithOwner}`, `url = git@${host}:${nameWithOwner}.git`];

        const content = fs.readFileSync(gitConfigPath, 'utf8');
        for (const line of content.split('\n')) {
          if (
            patterns.some((pattern) => {
              return line.trim() === pattern;
            })
          ) {
            repoPath = dirPath;
            break;
          }
        }
      } else {
        repoPath = this.getRepositoryPath(dirPath, recursion + 1);
      }
    } catch (error) {
      this.runner.debug(
        `Error when attempting to determine whether the path '${filePath}' is under the workflow repository: ${(error as Error).message}`,
      );
    }

    this.directoryMap.set(dirPath, repoPath);
    return repoPath;
  }
}
