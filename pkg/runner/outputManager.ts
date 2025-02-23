/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
// https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/OutputManager.cs
// @todo

import fs from 'node:fs';
import path from 'node:path';

import type Runner from '.';
import { IssueMatcher, IssueMatch } from './action/command/issueMatcher';
import ActionCommandManager from './action/command/manager';

export default class OutputManager {
  _colorCodePrefix = '\x1b[';

  _maxAttempts = 3;

  _timeoutKey = 'GITHUB_ACTIONS_RUNNER_ISSUE_MATCHER_TIMEOUT';

  _colorCodeRegex = /\\x1b\[[0-9;]*m?/g;

  // _commandManager = commandManager;

  _failsafe = 50;

  _directoryMap = new Map();

  matchers: IssueMatcher[] = [];

  constructor(public runner: Runner, public actionCommandManager = new ActionCommandManager(runner)) {}

  async onDataReceived(line: string) {
    if (await this.actionCommandManager.process(line)) {
      return;
    }

    // Handle issue matchers
    if (this.matchers.length > 0) {
      const stripped = line.includes(this._colorCodePrefix) ? line.replace(this._colorCodeRegex, '') : line;

      for (const matcher of this.matchers) {
        let match = null;
        for (let attempt = 1; attempt <= this._maxAttempts; attempt++) {
          try {
            match = matcher.match(stripped);
            break;
          } catch (error) {
            if (attempt < this._maxAttempts) {
              this.runner.debug(`Timeout processing issue matcher '${matcher.owner}' against line '${stripped}'. Exception: ${error}`);
            } else {
              // this.runner.warning(`Removing issue matcher '${matcher.owner}'. Matcher failed ${this._maxAttempts} times. Error: ${error.message}`);
              this.removeMatcher(matcher);
            }
          }
        }

        if (match) {
          // Reset other matchers
          this.matchers.filter((m) => { return m !== matcher; }).forEach((m) => { return m.reset(); });

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
  }

  removeMatcher(matcher: IssueMatcher) {
    this.matchers = this.matchers.filter((m) => { return m !== matcher; });
  }

  convertToIssue(match: IssueMatch) {
    if (!match.message || !match.message.trim()) {
      this.runner.debug('Skipping logging an issue for the matched line because the message is empty.');
      return null;
    }

    const issueType = this.getIssueType(match.severity);
    if (!issueType) {
      this.runner.debug(`Skipped logging an issue for the matched line because the severity '${match.severity}' is not supported.`);
      return null;
    }

    const issue = {
      message: match.message,
      type: issueType,
      data: {},
    };

    if (match.line && !Number.isNaN(parseInt(match.line, 10))) {
      issue.data.line = parseInt(match.line, 10);
    }

    if (match.column && !Number.isNaN(parseInt(match.column, 10))) {
      issue.data.col = parseInt(match.column, 10);
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
        this.runner.debug(`Dropping file value '${match.file}' and fromPath value '${match.fromPath}'. Exception during validation: ${error}`);
      }
    }

    return issue;
  }

  getIssueType(severity?: string) {
    if (!severity || severity.toLowerCase() === 'error') {
      return 'error';
    } if (severity.toLowerCase() === 'warning') {
      return 'warning';
    } if (severity.toLowerCase() === 'notice') {
      return 'notice';
    }
    return null;
  }

  getRepositoryPath(filePath: string, recursion = 0): string {
    if (this._directoryMap.size > 100) {
      this._directoryMap.clear();
    }

    const dirPath = path.dirname(filePath);
    if (!dirPath || recursion > this._failsafe) {
      return '';
    }

    if (this._directoryMap.has(dirPath)) {
      return this._directoryMap.get(dirPath);
    }

    let repoPath = '';
    try {
      const gitConfigPath = path.join(dirPath, '.git', 'config');
      if (fs.existsSync(gitConfigPath)) {
        const serverUrl = this.runner.context.github.server_url || 'https://github.com';
        const { host } = new URL(serverUrl);
        const nameWithOwner = this.runner.context.github.repository;
        const patterns = [
          `url = ${serverUrl}/${nameWithOwner}`,
          `url = git@${host}:${nameWithOwner}.git`,
        ];

        const content = fs.readFileSync(gitConfigPath, 'utf8');
        for (const line of content.split('\n')) {
          if (patterns.some((pattern) => { return line.trim() === pattern; })) {
            repoPath = dirPath;
            break;
          }
        }
      } else {
        repoPath = this.getRepositoryPath(dirPath, recursion + 1);
      }
    } catch (error) {
      this.runner.debug(`Error when attempting to determine whether the path '${filePath}' is under the workflow repository: ${error.message}`);
    }

    this._directoryMap.set(dirPath, repoPath);
    return repoPath;
  }
}
