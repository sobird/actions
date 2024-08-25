import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import simpleGit from 'simple-git';
import * as tar from 'tar';

class ActionCache {
  constructor(public dir: string = path.join(os.tmpdir(), 'actions')) {}

  async fetch(url: string, repository: string, ref: string, token?: string) {
    const repoPath = path.join(this.dir, `${repository}.git`);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    try {
      const repoURL = new URL(url);
      if (token) {
        repoURL.username = 'token';
        repoURL.password = token;
      }
      // eslint-disable-next-line no-param-reassign
      url = repoURL.toString();
    } catch (err) {
      //
    }

    try {
      await git.clone(url, repoPath, ['--bare']);
      // await git.addRemote('origin', url);
    } catch (err) {
      //
    }

    const branchName = crypto.randomBytes(16).toString('hex');

    try {
      await git.fetch(['origin', `${ref}:${branchName}`, '--force']);
    } catch (err) {
      return '';
    }

    const hash = await git.revparse(ref);
    git.deleteLocalBranch(branchName);
    return hash;
  }

  async archive(repository: string, ref: string, includePrefix: string = '') {
    const repoPath = path.join(this.dir, `${repository}.git`);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    const commit = await git.revparse(ref);
    const files = (await git.raw(['ls-tree', '-r', '--name-only', commit])).split('\n').filter((file) => {
      return file.startsWith(includePrefix);
    });

    return tar.create({ cwd: repoPath }, files);
  }
}

export default ActionCache;
