import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import simpleGit from 'simple-git';

class ActionCache {
  constructor(public dir: string = path.join(os.tmpdir(), 'actions')) {}

  async fetch(url: string, repository: string, ref: string, token?: string) {
    const repoPath = path.join(this.dir, `${repository}.git`);
    await fs.mkdir(repoPath, { recursive: true });

    const git = simpleGit(repoPath);

    try {
      const repoURL = new URL(url);
      if (token) {
        repoURL.username = 'token';
        repoURL.password = token;
      }
      // eslint-disable-next-line no-param-reassign
      url = repoURL.toString();
    } catch {
      //
    }

    try {
      await git.clone(url, repoPath, ['--bare']);
    } catch {
      //
    }

    try {
      const branchName = crypto.randomBytes(16).toString('hex');
      await git.fetch(['origin', `${ref}:${branchName}`, '--force']);
      const hash = await git.revparse(ref);
      git.deleteLocalBranch(branchName);
      return hash;
    } catch {
      return '';
    }
  }

  async archive(repository: string, ref: string, subPath: string = '.') {
    const repoPath = path.join(this.dir, `${repository}.git`);
    await fs.mkdir(repoPath, { recursive: true });

    const git = simpleGit(repoPath);
    subPath = path.normalize(subPath || '.');

    try {
      const buffer = await git.raw(['archive', '--format=tar', ref, subPath]);
      return Readable.from(buffer);
    } catch (err) {
      console.error('Git archive failed:', err);
      throw err;
    }
  }
}

export default ActionCache;
